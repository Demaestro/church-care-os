import "server-only";

function startsWithBytes(buffer, signature) {
  if (!Buffer.isBuffer(buffer) || buffer.length < signature.length) {
    return false;
  }

  for (let index = 0; index < signature.length; index += 1) {
    if (buffer[index] !== signature[index]) {
      return false;
    }
  }

  return true;
}

function looksLikeUtf8Text(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
    return false;
  }

  const sample = buffer.subarray(0, Math.min(buffer.length, 4096));
  let suspicious = 0;

  for (const byte of sample) {
    if (byte === 0) {
      return false;
    }

    const printable =
      byte === 9 ||
      byte === 10 ||
      byte === 13 ||
      (byte >= 32 && byte <= 126) ||
      byte >= 128;

    if (!printable) {
      suspicious += 1;
    }
  }

  return suspicious / sample.length < 0.05;
}

export function detectMimeTypeFromSignature(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 4) {
    return "";
  }

  if (startsWithBytes(buffer, [0x89, 0x50, 0x4e, 0x47])) {
    return "image/png";
  }

  if (startsWithBytes(buffer, [0xff, 0xd8, 0xff])) {
    return "image/jpeg";
  }

  if (
    buffer.length >= 12 &&
    buffer.toString("ascii", 0, 4) === "RIFF" &&
    buffer.toString("ascii", 8, 12) === "WEBP"
  ) {
    return "image/webp";
  }

  if (buffer.toString("ascii", 0, 5) === "%PDF-") {
    return "application/pdf";
  }

  if (buffer.length >= 4) {
    const zipHeader =
      startsWithBytes(buffer, [0x50, 0x4b, 0x03, 0x04]) ||
      startsWithBytes(buffer, [0x50, 0x4b, 0x05, 0x06]) ||
      startsWithBytes(buffer, [0x50, 0x4b, 0x07, 0x08]);

    if (zipHeader) {
      return "application/zip";
    }
  }

  if (looksLikeUtf8Text(buffer)) {
    return "text/plain";
  }

  return "";
}

export function assertExpectedFileSignature(buffer, mimeType, label = "file") {
  const detectedMimeType = detectMimeTypeFromSignature(buffer);

  if (!detectedMimeType) {
    throw new Error(`We could not verify the uploaded ${label}.`);
  }

  if (mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
    if (detectedMimeType !== "application/zip") {
      throw new Error(`The uploaded ${label} did not match its expected file type.`);
    }

    return;
  }

  if (detectedMimeType !== mimeType) {
    throw new Error(`The uploaded ${label} did not match its expected file type.`);
  }
}
