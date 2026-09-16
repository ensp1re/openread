import { parentPort, workerData } from "node:worker_threads";
import type { ParseJob } from "@/types/fetch";
import { parseArticle } from "./parse-article";

const job = workerData as ParseJob;
parentPort!.postMessage(parseArticle(job.html, job.url, job.options));
