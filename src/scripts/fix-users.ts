import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  console.log("Finding users with missing createdAt date...");

  const rawData: any = await prisma.user.findRaw({
    filter: {
      createdAt: { $exists: false },
    },
  });

  if (!Array.isArray(rawData)) {
    console.error(
      "Error: Expected an array of users but received something else."
    );
    return;
  }

  const usersToUpdate = rawData;

  if (usersToUpdate.length === 0) {
    console.log("✅ No users needed updating. Your data is clean!");
    return;
  }

  console.log(`Found ${usersToUpdate.length} user(s) to update.`);

  for (const user of usersToUpdate) {
    // --- [THE FIX] ---
    // When using findRaw, the ID is an object. We need to get the actual ID string from user._id.$oid
    const userId = user._id.$oid;

    await prisma.user.update({
      where: { id: userId },
      data: {
        createdAt: new Date(),
      },
    });
    console.log(`Updated user ${userId}`);
  }

  console.log("✅ Successfully fixed all old user records.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
