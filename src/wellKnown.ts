import express from "express";

const router = express.Router();

// Fedify handles webfinger for AP-enabled artists; fall through to 404 for
// non-AP artists or wrong-domain resources so the SPA catch-all doesn't grab them.
router.get("/.well-known/webfinger", (req, res) => {
  console.log("hi");
  res.status(404).json({ error: "Not found" });
});

router.get("/.well-known/assetlinks", (req, res) => {
  res.setHeader("Content-Type", "application/json");
  res.send(JSON.stringify([]));
});
router.get("/.well-known/assetlinks.json", (req, res) => {
  res.setHeader("Content-Type", "application/json");
  res.send(JSON.stringify([]));
});
export default router;
