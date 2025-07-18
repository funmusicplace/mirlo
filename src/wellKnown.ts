import express from "express";
import webfinger from "./activityPub/webfinger";

const router = express.Router();

router.get("/.well-known/webfinger", webfinger);
router.get("/.well-known/assetlinks", (req, res) => {
  res.setHeader("Content-Type", "application/json");
  res.send(JSON.stringify([]));
});
export default router;
