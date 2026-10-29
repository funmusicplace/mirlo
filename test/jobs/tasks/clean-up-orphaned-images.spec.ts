import assert from "assert";

import prisma from "@mirlo/prisma";
import * as dotenv from "dotenv";
dotenv.config();
import { beforeEach, describe, it } from "mocha";

import cleanUpOrphanedImages, {
  ORPHANED_IMAGE_GRACE_HOURS,
} from "../../../src/jobs/tasks/clean-up-orphaned-images";
import {
  clearTables,
  createProfile,
  createProfileImage,
  createUser,
} from "../../utils";

describe("clean-up-orphaned-images", () => {
  beforeEach(async () => {
    await clearTables();
  });

  it("soft-deletes old unlinked images and keeps linked or recent ones", async () => {
    const { user } = await createUser({ email: "artist@test.com" });
    const profile = await createProfile(user.id);
    const old = new Date();
    old.setHours(old.getHours() - ORPHANED_IMAGE_GRACE_HOURS - 1);

    const orphan = await prisma.image.create({
      data: { dimensions: "square", profileId: profile.id, createdAt: old },
    });
    const recent = await prisma.image.create({
      data: { dimensions: "square", profileId: profile.id },
    });
    const avatar = await createProfileImage(profile.id, "avatar");
    await prisma.image.update({
      where: { id: avatar.id },
      data: { createdAt: old },
    });

    await cleanUpOrphanedImages();

    const left = await prisma.image.findMany({ select: { id: true } });
    assert.deepEqual(
      left.map((i) => i.id).sort(),
      [recent.id, avatar.id].sort()
    );
    const deleted = await prisma.image.findFirst({
      where: { id: orphan.id, deletedAt: { not: null } },
    });
    assert.ok(deleted);
  });
});
