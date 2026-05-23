import { prisma } from "../storage";

export async function findAllCategories() {
  return prisma.category.findMany({
    orderBy: { name: "asc" }
  });
}

export async function deleteCategoryById(categoryId: number) {
  return prisma.category.delete({
    where: { id: categoryId }
  });
}