import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadBucketCommand,
  CreateBucketCommand,
} from "@aws-sdk/client-s3";
import type { Readable } from "stream";

/**
 * MinIO-compatible object storage (S3 API) — lazy singleton client, mirrors
 * @poramma/mailer's initMailer()/sendMail() pattern. MinIO is only reachable
 * inside the Docker network (hostname "minio", see docker-compose.yml), so
 * consumers must stream file bytes back through their own authenticated API
 * endpoint rather than handing out presigned URLs directly to the browser.
 */

let client: S3Client | undefined;
let bucket: string | undefined;

export function initStorage(): void {
  const endpoint = process.env.MINIO_ENDPOINT;
  const accessKeyId = process.env.MINIO_ROOT_USER;
  const secretAccessKey = process.env.MINIO_ROOT_PASSWORD;
  const bucketName = process.env.MINIO_BUCKET;

  if (!endpoint || !accessKeyId || !secretAccessKey || !bucketName) {
    throw new Error(
      "MINIO_ENDPOINT, MINIO_ROOT_USER, MINIO_ROOT_PASSWORD and MINIO_BUCKET must all be set"
    );
  }

  bucket = bucketName;
  client = new S3Client({
    endpoint,
    region: "us-east-1",
    forcePathStyle: true, // MinIO uses path-style bucket addressing, not virtual-hosted
    credentials: { accessKeyId, secretAccessKey },
  });
}

function getClient(): S3Client {
  if (!client) initStorage();
  return client!;
}

function getBucket(): string {
  if (!bucket) initStorage();
  return bucket!;
}

/** Idempotent — creates the configured bucket if it doesn't exist yet. Call once at service startup. */
export async function ensureBucket(): Promise<void> {
  const c = getClient();
  const b = getBucket();
  try {
    await c.send(new HeadBucketCommand({ Bucket: b }));
  } catch {
    await c.send(new CreateBucketCommand({ Bucket: b }));
  }
}

export interface UploadResult {
  key: string;
  size: number;
}

export async function uploadObject(key: string, body: Buffer, contentType: string): Promise<UploadResult> {
  await getClient().send(
    new PutObjectCommand({ Bucket: getBucket(), Key: key, Body: body, ContentType: contentType })
  );
  return { key, size: body.length };
}

export interface StoredObject {
  buffer: Buffer;
  contentType?: string;
}

export async function getObject(key: string): Promise<StoredObject> {
  const res = await getClient().send(new GetObjectCommand({ Bucket: getBucket(), Key: key }));
  const buffer = Buffer.from(await res.Body!.transformToByteArray());
  return { buffer, contentType: res.ContentType };
}

export interface StoredObjectStream {
  stream: Readable;
  contentType?: string;
  /** Taille du contenu renvoyé (celle de la plage demandée le cas échéant). */
  contentLength?: number;
  /** Renseigné pour une réponse partielle (ex. "bytes 0-1023/52428800"). */
  contentRange?: string;
}

/**
 * Lecture en flux, avec prise en charge d'un en-tête HTTP `Range` — nécessaire
 * pour lire/avancer dans une vidéo sans charger le fichier entier en mémoire.
 * `range` est passé tel quel à S3 ("bytes=0-1023") ; une plage invalide lève
 * une erreur dont `name === "InvalidRange"`.
 */
export async function getObjectStream(key: string, range?: string): Promise<StoredObjectStream> {
  const res = await getClient().send(new GetObjectCommand({ Bucket: getBucket(), Key: key, Range: range }));
  return {
    stream: res.Body as Readable,
    contentType: res.ContentType,
    contentLength: res.ContentLength,
    contentRange: res.ContentRange,
  };
}

export async function deleteObject(key: string): Promise<void> {
  await getClient().send(new DeleteObjectCommand({ Bucket: getBucket(), Key: key }));
}
