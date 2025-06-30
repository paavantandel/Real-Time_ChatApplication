const express = require("express");
const router = express.Router();
const Group = require("../Models/Group");

router.post("/create", async (req, res) => {
  const { name, members } = req.body;
  const group = new Group({ name, members });
  await group.save();
  res.json(group);
});

router.get("/all/:userId", async (req, res) => {
  const groups = await Group.find({ members: req.params.userId });
  res.json(groups);
});

module.exports = router;
