import { registerStorageAdapter } from '../shared/storage-port';
import { prisma } from './storage';

// Register server prisma with shared storage port
registerStorageAdapter({ prisma });
