import { updateCustomColumn, deleteCustomColumn } from "@/lib/db/custom-columns";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const updates = await request.json();

    if (!id) {
      return Response.json({ error: "Missing column ID" }, { status: 400 });
    }

    const updated = await updateCustomColumn(id, updates);

    if (!updated) {
      return Response.json({ error: "Failed to update column" }, { status: 500 });
    }

    return Response.json(updated);
  } catch (error) {
    console.error("Error updating column:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return Response.json({ error: "Missing column ID" }, { status: 400 });
    }

    const success = await deleteCustomColumn(id);

    if (!success) {
      return Response.json({ error: "Failed to delete column" }, { status: 500 });
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error("Error deleting column:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
