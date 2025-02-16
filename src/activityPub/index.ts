import express from "express";
import webfinger from "./webfinger";

const router = express.Router();

router.get("/.well-known/webfinger", webfinger);

export default router;
