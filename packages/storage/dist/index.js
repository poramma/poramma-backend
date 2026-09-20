"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initStorage = initStorage;
exports.ensureBucket = ensureBucket;
exports.uploadObject = uploadObject;
exports.getObject = getObject;
exports.getObjectStream = getObjectStream;
exports.deleteObject = deleteObject;
const client_s3_1 = require("@aws-sdk/client-s3");
let client;
let bucket;
function initStorage() {
    const endpoint = process.env.MINIO_ENDPOINT;
    const accessKeyId = process.env.MINIO_ROOT_USER;
    const secretAccessKey = process.env.MINIO_ROOT_PASSWORD;
    const bucketName = process.env.MINIO_BUCKET;
    if (!endpoint || !accessKeyId || !secretAccessKey || !bucketName) {
        throw new Error("MINIO_ENDPOINT, MINIO_ROOT_USER, MINIO_ROOT_PASSWORD and MINIO_BUCKET must all be set");
    }
    bucket = bucketName;
    client = new client_s3_1.S3Client({
        endpoint,
        region: "us-east-1",
        forcePathStyle: true,
        credentials: { accessKeyId, secretAccessKey },
    });
}
function getClient() {
    if (!client)
        initStorage();
    return client;
}
function getBucket() {
    if (!bucket)
        initStorage();
    return bucket;
}
async function ensureBucket() {
    const c = getClient();
    const b = getBucket();
    try {
        await c.send(new client_s3_1.HeadBucketCommand({ Bucket: b }));
    }
    catch {
        await c.send(new client_s3_1.CreateBucketCommand({ Bucket: b }));
    }
}
async function uploadObject(key, body, contentType) {
    await getClient().send(new client_s3_1.PutObjectCommand({ Bucket: getBucket(), Key: key, Body: body, ContentType: contentType }));
    return { key, size: body.length };
}
async function getObject(key) {
    const res = await getClient().send(new client_s3_1.GetObjectCommand({ Bucket: getBucket(), Key: key }));
    const buffer = Buffer.from(await res.Body.transformToByteArray());
    return { buffer, contentType: res.ContentType };
}
async function getObjectStream(key, range) {
    const res = await getClient().send(new client_s3_1.GetObjectCommand({ Bucket: getBucket(), Key: key, Range: range }));
    return {
        stream: res.Body,
        contentType: res.ContentType,
        contentLength: res.ContentLength,
        contentRange: res.ContentRange,
    };
}
async function deleteObject(key) {
    await getClient().send(new client_s3_1.DeleteObjectCommand({ Bucket: getBucket(), Key: key }));
}
//# sourceMappingURL=index.js.map