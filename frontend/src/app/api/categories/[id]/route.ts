import { ObjectId } from "mongodb";
import { getCategories, getTasks } from "@/lib/mongodb";
import { handle, json, requireUser, fail } from "@/lib/api";
import { categoryUpdateSchema } from "@/lib/validations";
import { serializeCategory } from "@/lib/serialize";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function objectId(id: string): ObjectId | null {
  return ObjectId.isValid(id) && String(new ObjectId(id)) === id
    ? new ObjectId(id)
    : null;
}

/** PATCH /api/categories/:id */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser();
    const { id } = await params;

    const _id = objectId(id);
    if (!_id) return fail("Category not found", 404);

    const body = categoryUpdateSchema.parse(await request.json());
    if (Object.keys(body).length === 0) {
      return fail("No valid fields to update", 400);
    }

    const categories = await getCategories();

    if (body.name) {
      const clash = await categories.findOne({
        userId: user.id,
        _id: { $ne: _id },
        name: {
          $regex: `^${body.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`,
          $options: "i",
        },
      });
      if (clash) return fail("That category already exists", 409);
    }

    const updated = await categories.findOneAndUpdate(
      { _id, userId: user.id },
      { $set: { ...body, updatedAt: new Date() } },
      { returnDocument: "after" },
    );

    if (!updated) return fail("Category not found", 404);
    return json({ category: serializeCategory(updated) });
  } catch (error) {
    return handle(error, "categories/update");
  }
}

/**
 * DELETE /api/categories/:id
 *
 * Tasks that used this category are detached rather than deleted. Doing the
 * detach in the same request keeps the write count at two and stops tasks
 * pointing at an id that no longer resolves.
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser();
    const { id } = await params;

    const _id = objectId(id);
    if (!_id) return fail("Category not found", 404);

    const categories = await getCategories();
    const result = await categories.deleteOne({ _id, userId: user.id });

    if (result.deletedCount === 0) return fail("Category not found", 404);

    const tasks = await getTasks();
    const detached = await tasks.updateMany(
      { userId: user.id, categoryId: _id.toHexString() },
      { $set: { categoryId: null, updatedAt: new Date() } },
    );

    return json({ ok: true, detached: detached.modifiedCount });
  } catch (error) {
    return handle(error, "categories/delete");
  }
}
