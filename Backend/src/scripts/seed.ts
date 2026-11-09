import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { connectDatabase, disconnectDatabase } from '../config/database';
import { env } from '../config/env';
import {
  User,
  Session,
  PasswordResetToken,
  Account,
  Salary,
  Transaction,
  Budget,
  Goal,
  GoalContribution,
} from '../models';
import { login } from '../services/auth.service';

async function seedDatabase(): Promise<void> {
  console.log('🚀 Connecting to MongoDB Atlas...');
  await connectDatabase();
  console.log(`📡 Connected to database: "${mongoose.connection.name}"`);

  // 1. Ensure all collections and indexes exist
  const models = [
    { name: 'User', model: User },
    { name: 'Session', model: Session },
    { name: 'PasswordResetToken', model: PasswordResetToken },
    { name: 'Account', model: Account },
    { name: 'Salary', model: Salary },
    { name: 'Transaction', model: Transaction },
    { name: 'Budget', model: Budget },
    { name: 'Goal', model: Goal },
    { name: 'GoalContribution', model: GoalContribution },
  ];

  console.log('\n📦 Creating tables/collections and syncing indexes...');
  for (const { name, model } of models) {
    try {
      await model.createCollection();
      await model.syncIndexes();
      console.log(`  ✓ Collection "${model.collection.name}" (${name}) initialized with indexes.`);
    } catch (err: unknown) {
      console.error(`  ✗ Error creating collection for ${name}:`, err);
    }
  }

  // 2. Create or update user: ashik@admin.com / ashik2004
  const targetEmail = 'ashik@admin.com';
  const targetPassword = 'ashik2004';
  const hashedPassword = await bcrypt.hash(targetPassword, env.BCRYPT_ROUNDS);

  console.log(`\n👤 Setting up user: ${targetEmail}...`);
  let user = await User.findOne({ email: targetEmail }).select('+passwordHash');

  if (!user) {
    user = await User.create({
      name: 'Ashik Admin',
      email: targetEmail,
      passwordHash: hashedPassword,
      isActive: true,
      timezone: 'Asia/Kolkata',
    });
    console.log(`  ✓ User created successfully with ID: ${user._id}`);
  } else {
    user.passwordHash = hashedPassword;
    user.isActive = true;
    await user.save();
    console.log(`  ✓ User already existed. Password updated for: ${user.email} (ID: ${user._id})`);
  }

  // 3. Set up initial account if user has none (Single Wallet Model)
  const existingAccounts = await Account.find({ userId: user._id, isArchived: false });
  if (existingAccounts.length === 0) {
    console.log('\n💳 Setting up default single wallet...');
    const mainWallet = await Account.create({
      userId: user._id,
      name: 'Main Wallet',
      type: 'wallet',
      currency: 'INR',
      openingBalance: 2485000, // ₹24,850 matching reference UI
      currentBalance: 2485000,
    });
    console.log(`  ✓ Created wallet: ${mainWallet.name} (₹24,850.00)`);
  } else {
    console.log(`\n💳 Found ${existingAccounts.length} existing accounts for ${targetEmail}.`);
  }

  // 4. Set up default salary if user has none
  const existingSalary = await Salary.findOne({ userId: user._id });
  if (!existingSalary) {
    console.log('\n💼 Setting up default salary record...');
    const salary = await Salary.create({
      userId: user._id,
      baseMonthlySalary: 7500000, // ₹75,000
      currency: 'INR',
      effectiveDate: new Date(),
      revisions: [],
      notes: 'Initial monthly salary',
    });
    console.log(`  ✓ Created initial salary record: ₹75,000.00 (ID: ${salary._id})`);
  }

  // 5. Verify authentication
  console.log('\n🔐 Testing login authentication...');
  try {
    const loginResult = await login(targetEmail, targetPassword);
    console.log('  ✓ Login successful!');
    console.log(`  ✓ Authenticated as: ${loginResult.user.name} (${loginResult.user.email})`);
    console.log(`  ✓ Access Token generated: ${loginResult.tokens.accessToken.slice(0, 20)}...`);
    console.log(`  ✓ Refresh Token generated: ${loginResult.tokens.refreshToken.slice(0, 20)}...`);
  } catch (authError) {
    console.error('  ✗ Login test failed:', authError);
    throw authError;
  }

  // 6. List all collections in MongoDB
  const collections = await mongoose.connection.db?.listCollections().toArray();
  console.log('\n📊 Collections present in database:');
  collections?.forEach((c) => console.log(`  - ${c.name}`));

  console.log('\n🎉 Database initialization completed successfully!');
}

seedDatabase()
  .catch((err) => {
    console.error('Fatal error during seed:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectDatabase();
    process.exit();
  });
