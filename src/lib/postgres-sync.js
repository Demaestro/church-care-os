import "server-only";

import { randomUUID } from "node:crypto";
import { AsyncLocalStorage } from "node:async_hooks";
import {
  MessageChannel,
  Worker,
  receiveMessageOnPort,
} from "node:worker_threads";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

// Resolve worker path without new URL() so Turbopack does not attempt
// to statically bundle the worker file as a module dependency.
const _dirname = dirname(fileURLToPath(/* turbopackIgnore: true */ import.meta.url));
const WORKER_PATH = join(_dirname, "postgres-sync-worker.mjs");

const transactionContext = new AsyncLocalStorage();

let worker;
let workerStartupError = null;

function getWorker() {
  if (workerStartupError) {
    throw workerStartupError;
  }

  if (!worker) {
    worker = new Worker(WORKER_PATH, {
      type: "module",
      env: process.env,
    });

    worker.on("error", (error) => {
      workerStartupError = error;
    });

    worker.on("exit", (code) => {
      worker = undefined;
      if (code !== 0) {
        workerStartupError = new Error(
          `PostgreSQL sync worker exited unexpectedly with code ${code}.`
        );
      }
    });
  }

  return worker;
}

function readWorkerResponse(port) {
  let message = receiveMessageOnPort(port)?.message;
  const start = Date.now();

  while (!message && Date.now() - start < 50) {
    message = receiveMessageOnPort(port)?.message;
  }

  return message;
}

function callWorker(action, payload = {}) {
  const activeWorker = getWorker();
  const sharedBuffer = new SharedArrayBuffer(4);
  const signal = new Int32Array(sharedBuffer);
  const { port1, port2 } = new MessageChannel();

  try {
    activeWorker.postMessage(
      {
        action,
        payload,
        sharedBuffer,
        port: port2,
      },
      [port2]
    );

    const waitResult = Atomics.wait(signal, 0, 0, 30000);
    if (waitResult === "timed-out") {
      throw new Error(`Timed out waiting for PostgreSQL ${action} response.`);
    }

    const response = readWorkerResponse(port1);
    if (!response) {
      throw new Error(`No PostgreSQL response was received for ${action}.`);
    }

    if (!response.ok) {
      const error = new Error(response.error?.message || "PostgreSQL request failed.");
      error.name = response.error?.name || "Error";
      error.stack = response.error?.stack || error.stack;
      throw error;
    }

    return response.value;
  } finally {
    port1.close();
  }
}

class PostgresStatement {
  constructor(sql, transactionId = "") {
    this.sql = sql;
    this.transactionId = transactionId;
  }

  get(...params) {
    return callWorker("query", {
      sql: this.sql,
      params,
      mode: "get",
      transactionId: this.transactionId,
    });
  }

  all(...params) {
    return callWorker("query", {
      sql: this.sql,
      params,
      mode: "all",
      transactionId: this.transactionId,
    });
  }

  run(...params) {
    return callWorker("query", {
      sql: this.sql,
      params,
      mode: "run",
      transactionId: this.transactionId,
    });
  }
}

class PostgresDatabase {
  constructor(transactionId = "") {
    this.transactionId = transactionId;
  }

  prepare(sql) {
    return new PostgresStatement(sql, this.transactionId);
  }

  exec(sql) {
    return callWorker("exec", {
      sql,
      transactionId: this.transactionId,
    });
  }

  close() {
    if (!this.transactionId) {
      closePostgresDatabase();
    }
  }
}

let database;

export function getPostgresDatabase() {
  if (!database) {
    callWorker("initialize");
    database = new PostgresDatabase();
  }

  return database;
}

export function getPostgresHealth() {
  getPostgresDatabase().prepare("SELECT 1 AS ok").get();

  return {
    storeMode: "postgres",
  };
}

export function getPostgresScopedDatabase() {
  const transactionId = transactionContext.getStore();
  return transactionId ? new PostgresDatabase(transactionId) : getPostgresDatabase();
}

export function withPostgresTransaction(callback) {
  const transactionId = randomUUID();
  callWorker("beginTransaction", { transactionId });

  try {
    return transactionContext.run(transactionId, () => {
      const result = callback(new PostgresDatabase(transactionId));
      callWorker("commitTransaction", { transactionId });
      return result;
    });
  } catch (error) {
    callWorker("rollbackTransaction", { transactionId });
    throw error;
  }
}

export function closePostgresDatabase() {
  if (!worker) {
    database = undefined;
    workerStartupError = null;
    return;
  }

  try {
    callWorker("shutdown");
  } catch {
    worker.terminate();
  } finally {
    worker = undefined;
    workerStartupError = null;
    database = undefined;
  }
}
