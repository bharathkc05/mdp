import mongoose from "mongoose";

export const getHealthStatus = async () => {
  const healthCheck = {
    status: "UP",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: { status: "unknown", responseTime: null }
  };

  const startTime = Date.now();
  if (mongoose.connection.readyState === 1) {
    await mongoose.connection.db.admin().ping();
    const responseTime = Date.now() - startTime;
    healthCheck.database.status = "connected";
    healthCheck.database.responseTime = `${responseTime}ms`;
  } else {
    healthCheck.status = "DOWN";
    healthCheck.database.status = "disconnected";
    throw new Error('Database disconnected');
  }

  return healthCheck;
};
