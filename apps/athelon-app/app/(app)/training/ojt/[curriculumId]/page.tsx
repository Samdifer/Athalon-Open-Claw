"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { useParams } from "react-router-dom";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { useCurrentOrg } from "@/hooks/useCurrentOrg";
import { toast } from "sonner";
import { ChevronDown, GripVertical, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Section = Doc<"ojtCurriculumSections">;
type Task = Doc<"ojtTasks">;

export default function OjtCurriculumDetailPage() {
  const { curriculumId } = useParams<{ curriculumId: string }>();
  const { orgId } = useCurrentOrg();

  const curriculum = useQuery(
    api.ojt.getCurriculum,
    curriculumId ? { id: curriculumId as Id<"ojtCurricula"> } : "skip",
  );
  const sections = useQuery(
    api.ojt.listSections,
    curriculumId ? { curriculumId: curriculumId as Id<"ojtCurricula"> } : "skip",
  ) ?? [];
  const tasks = useQuery(
    api.ojt.listTasksByCurriculum,
    curriculumId ? { curriculumId: curriculumId as Id<"ojtCurricula"> } : "skip",
  ) ?? [];

  const createSection = useMutation(api.ojt.createSection);
  const updateSection = useMutation(api.ojt.updateSection);
  const deleteSection = useMutation(api.ojt.deleteSection);
  const createTask = useMutation(api.ojt.createTask);
  const updateTask = useMutation(api.ojt.updateTask);
  const deleteTask = useMutation(api.ojt.deleteTask);

  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [showSectionDialog, setShowSectionDialog] = useState(false);
  const [showTaskDialog, setShowTaskDialog] = useState(false);
  const [editingSection, setEditingSection] = useState<Section | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [taskSectionId, setTaskSectionId] = useState<Id<"ojtCurriculumSections"> | null>(null);

  const [sectionName, setSectionName] = useState("");
  const [sectionDescription, setSectionDescription] = useState("");
  const [ataChapter, setAtaChapter] = useState("");
  const [taskDescription, setTaskDescription] = useState("");
  const [approvedDataRef, setApprovedDataRef] = useState("");

  const orderedSections = useMemo(
    () => [...sections].sort((a, b) => a.displayOrder - b.displayOrder),
    [sections],
  );

  const tasksBySection = useMemo(() => {
    const map = new Map<string, Task[]>();
    for (const task of tasks) {
      const bucket = map.get(task.sectionId) ?? [];
      bucket.push(task);
      map.set(task.sectionId, bucket);
    }
    for (const [key, bucket] of map.entries()) {
      map.set(key, bucket.sort((a, b) => a.displayOrder - b.displayOrder));
    }
    return map;
  }, [tasks]);

  const [dragSectionId, setDragSectionId] = useState<string | null>(null);
  const [dragTaskId, setDragTaskId] = useState<string | null>(null);

  const reorderSections = async (sourceId: string, targetId: string) => {
    const list = [...orderedSections];
    const from = list.findIndex((s) => s._id === sourceId);
    const to = list.findIndex((s) => s._id === targetId);
    if (from < 0 || to < 0 || from === to) return;
    const [moved] = list.splice(from, 1);
    list.splice(to, 0, moved);
    await Promise.all(
      list.map((s, idx) => updateSection({ id: s._id, displayOrder: idx + 1 })),
    );
    toast.success("Sections reordered");
  };

  const reorderTasks = async (sectionId: string, sourceId: string, targetId: string) => {
    const current = [...(tasksBySection.get(sectionId) ?? [])];
    const from = current.findIndex((t) => t._id === sourceId);
    const to = current.findIndex((t) => t._id === targetId);
    if (from < 0 || to < 0 || from === to) return;
    const [moved] = current.splice(from, 1);
    current.splice(to, 0, moved);
    await Promise.all(current.map((t, idx) => updateTask({ id: t._id, displayOrder: idx + 1 })));
    toast.success("Tasks reordered");
  };

  const submitSection = async () => {
    if (!orgId || !curriculumId || !sectionName.trim()) return toast.error("Section name is required");
    try {
      if (editingSection) {
        await updateSection({ id: editingSection._id, name: sectionName.trim(), description: sectionDescription || undefined });
        toast.success("Section updated");
      } else {
        await createSection({
          organizationId: orgId,
          curriculumId: curriculumId as Id<"ojtCurricula">,
          name: sectionName.trim(),
          description: sectionDescription || undefined,
          displayOrder: orderedSections.length + 1,
        });
        toast.success("Section created");
      }
      setShowSectionDialog(false);
      setEditingSection(null);
      setSectionName("");
      setSectionDescription("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save section");
    }
  };

  const submitTask = async () => {
    if (!orgId || !curriculumId || !taskSectionId || !ataChapter.trim() || !taskDescription.trim()) {
      return toast.error("Section, ATA chapter, and description are required");
    }
    try {
      const currentTasks = tasksBySection.get(taskSectionId) ?? [];
      if (editingTask) {
        await updateTask({
          id: editingTask._id,
          ataChapter: ataChapter.trim(),
          description: taskDescription.trim(),
          approvedDataRef: approvedDataRef || undefined,
        });
        toast.success("Task updated");
      } else {
        await createTask({
          organizationId: orgId,
          curriculumId: curriculumId as Id<"ojtCurricula">,
          sectionId: taskSectionId,
          ataChapter: ataChapter.trim(),
          description: taskDescription.trim(),
          approvedDataRef: approvedDataRef || undefined,
          isSharedAcrossTypes: false,
          displayOrder: currentTasks.length + 1,
        });
        toast.success("Task created");
      }
      setShowTaskDialog(false);
      setEditingTask(null);
      setTaskSectionId(null);
      setAtaChapter("");
      setTaskDescription("");
      setApprovedDataRef("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save task");
    }
  };

  return (
    <div className="space-y-6 p-6">
      <Card>
        <CardHeader>
          <CardTitle>{curriculum?.name ?? "Curriculum"}</CardTitle>
          <div className="text-sm text-muted-foreground flex items-center gap-3">
            <span>Aircraft: {curriculum?.aircraftType ?? "—"}</span>
            <Badge variant={curriculum?.isActive === false ? "outline" : "default"}>
              {curriculum?.isActive === false ? "Inactive" : "Active"}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">{curriculum?.description ?? "No description"}</p>
        </CardHeader>
      </Card>

      <div className="flex gap-2">
        <Button onClick={() => { setEditingSection(null); setSectionName(""); setSectionDescription(""); setShowSectionDialog(true); }}>
          <Plus className="h-4 w-4 mr-2" /> Add Section
        </Button>
      </div>

      <div className="space-y-3">
        {orderedSections.map((section) => {
          const sectionTasks = tasksBySection.get(section._id) ?? [];
          const isOpen = expanded[section._id] ?? true;
          return (
            <Card
              key={section._id}
              draggable
              onDragStart={() => setDragSectionId(section._id)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={async () => {
                if (dragSectionId && dragSectionId !== section._id) await reorderSections(dragSectionId, section._id);
                setDragSectionId(null);
              }}
            >
              <CardHeader className="py-3">
                <div className="flex items-center gap-2">
                  <GripVertical className="h-4 w-4 text-muted-foreground" />
                  <button
                    type="button"
                    className="inline-flex items-center gap-2 font-medium"
                    onClick={() => setExpanded((s) => ({ ...s, [section._id]: !isOpen }))}
                  >
                    <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? "rotate-0" : "-rotate-90"}`} />
                    {section.name}
                  </button>
                  <Badge variant="outline">{sectionTasks.length} tasks</Badge>
                  <div className="ml-auto flex items-center gap-2">
                    <Button size="sm" variant="outline" onClick={() => {
                      setEditingSection(section);
                      setSectionName(section.name);
                      setSectionDescription(section.description ?? "");
                      setShowSectionDialog(true);
                    }}><Pencil className="h-4 w-4" /></Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={async () => {
                        try {
                          await deleteSection({ id: section._id });
                          toast.success("Section deleted");
                        } catch (error) {
                          toast.error(error instanceof Error ? error.message : "Failed to delete section");
                        }
                      }}
                    ><Trash2 className="h-4 w-4" /></Button>
                    <Button size="sm" onClick={() => {
                      setTaskSectionId(section._id);
                      setEditingTask(null);
                      setAtaChapter("");
                      setTaskDescription("");
                      setApprovedDataRef("");
                      setShowTaskDialog(true);
                    }}><Plus className="h-4 w-4 mr-1" /> Add Task</Button>
                  </div>
                </div>
              </CardHeader>

              {isOpen && (
                <CardContent className="space-y-2">
                  {sectionTasks.map((task) => (
                    <div
                      key={task._id}
                      draggable
                      onDragStart={() => setDragTaskId(task._id)}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={async () => {
                        if (dragTaskId && dragTaskId !== task._id) await reorderTasks(section._id, dragTaskId, task._id);
                        setDragTaskId(null);
                      }}
                      className="rounded-md border p-3"
                    >
                      <div className="flex items-start gap-2">
                        <GripVertical className="h-4 w-4 text-muted-foreground mt-1" />
                        <div className="flex-1">
                          <div className="text-sm font-medium">ATA {task.ataChapter}</div>
                          <div className="text-sm">{task.description}</div>
                          <div className="text-xs text-muted-foreground mt-1">
                            Approved Data: {task.approvedDataRef || "—"}
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Button size="sm" variant="outline" onClick={() => {
                            setEditingTask(task);
                            setTaskSectionId(task.sectionId);
                            setAtaChapter(task.ataChapter);
                            setTaskDescription(task.description);
                            setApprovedDataRef(task.approvedDataRef ?? "");
                            setShowTaskDialog(true);
                          }}><Pencil className="h-4 w-4" /></Button>
                          <Button size="sm" variant="outline" onClick={async () => {
                            try {
                              await deleteTask({ id: task._id });
                              toast.success("Task deleted");
                            } catch (error) {
                              toast.error(error instanceof Error ? error.message : "Failed to delete task");
                            }
                          }}><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>

      <Dialog open={showSectionDialog} onOpenChange={setShowSectionDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingSection ? "Edit Section" : "Add Section"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Section Name</Label>
              <Input value={sectionName} onChange={(e) => setSectionName(e.target.value)} />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={sectionDescription} onChange={(e) => setSectionDescription(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSectionDialog(false)}>Cancel</Button>
            <Button onClick={submitSection}>{editingSection ? "Save" : "Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showTaskDialog} onOpenChange={setShowTaskDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingTask ? "Edit Task" : "Add Task"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Section</Label>
              <Select
                value={taskSectionId ?? undefined}
                onValueChange={(value) => setTaskSectionId(value as Id<"ojtCurriculumSections">)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select section" />
                </SelectTrigger>
                <SelectContent>
                  {orderedSections.map((s) => (
                    <SelectItem key={s._id} value={s._id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>ATA Chapter</Label>
              <Input value={ataChapter} onChange={(e) => setAtaChapter(e.target.value)} />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={taskDescription} onChange={(e) => setTaskDescription(e.target.value)} />
            </div>
            <div>
              <Label>Approved Data Ref</Label>
              <Input value={approvedDataRef} onChange={(e) => setApprovedDataRef(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTaskDialog(false)}>Cancel</Button>
            <Button onClick={submitTask}>{editingTask ? "Save" : "Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
