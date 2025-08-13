"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Target,
  Plus,
  Edit,
  Trash2,
  Calendar,
  TrendingUp,
  CheckCircle,
  Clock,
  AlertTriangle,
} from "lucide-react";
import { Goal } from "@/types/staff";

interface GoalTrackerProps {
  staffId: string;
  staffName: string;
  businessId: string;
  goals: Goal[];
  onUpdateGoal: (goal: Goal) => Promise<void>;
  onDeleteGoal: (goalId: string) => Promise<void>;
  onCreateGoal: (goal: Omit<Goal, "id">) => Promise<void>;
  isLoading?: boolean;
  canEdit?: boolean;
}

interface GoalFormData {
  title: string;
  description: string;
  target_date: string;
  status: Goal["status"];
  progress_percentage: number;
}

const initialGoalForm: GoalFormData = {
  title: "",
  description: "",
  target_date: "",
  status: "not_started",
  progress_percentage: 0,
};

export function GoalTracker({
  staffId,
  staffName,
  businessId,
  goals,
  onUpdateGoal,
  onDeleteGoal,
  onCreateGoal,
  isLoading = false,
  canEdit = true,
}: GoalTrackerProps) {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [goalForm, setGoalForm] = useState<GoalFormData>(initialGoalForm);

  const getStatusIcon = (status: Goal["status"]) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "in_progress":
        return <Clock className="h-4 w-4 text-blue-500" />;
      case "overdue":
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      default:
        return <Target className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: Goal["status"]) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800";
      case "in_progress":
        return "bg-blue-100 text-blue-800";
      case "overdue":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const isGoalOverdue = (goal: Goal) => {
    if (goal.status === "completed") return false;
    const targetDate = new Date(goal.target_date);
    const today = new Date();
    return targetDate < today;
  };

  const getDaysUntilTarget = (targetDate: string) => {
    const target = new Date(targetDate);
    const today = new Date();
    const diffTime = target.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const handleCreateGoal = async () => {
    if (!goalForm.title.trim()) return;

    const newGoal: Omit<Goal, "id"> = {
      ...goalForm,
      progress_percentage:
        goalForm.status === "completed" ? 100 : goalForm.progress_percentage,
    };

    await onCreateGoal(newGoal);
    setGoalForm(initialGoalForm);
    setIsCreateDialogOpen(false);
  };

  const handleUpdateGoal = async () => {
    if (!editingGoal || !goalForm.title.trim()) return;

    const updatedGoal: Goal = {
      ...editingGoal,
      ...goalForm,
      progress_percentage:
        goalForm.status === "completed" ? 100 : goalForm.progress_percentage,
    };

    await onUpdateGoal(updatedGoal);
    setEditingGoal(null);
    setGoalForm(initialGoalForm);
  };

  const startEditing = (goal: Goal) => {
    setEditingGoal(goal);
    setGoalForm({
      title: goal.title,
      description: goal.description,
      target_date: goal.target_date,
      status: goal.status,
      progress_percentage: goal.progress_percentage,
    });
  };

  const cancelEditing = () => {
    setEditingGoal(null);
    setGoalForm(initialGoalForm);
  };

  // Update progress when status changes
  useEffect(() => {
    if (goalForm.status === "completed" && goalForm.progress_percentage < 100) {
      setGoalForm((prev) => ({ ...prev, progress_percentage: 100 }));
    } else if (
      goalForm.status === "not_started" &&
      goalForm.progress_percentage > 0
    ) {
      setGoalForm((prev) => ({ ...prev, progress_percentage: 0 }));
    }
  }, [goalForm.status]);

  const activeGoals = goals.filter((g) => g.status !== "completed");
  const completedGoals = goals.filter((g) => g.status === "completed");
  const overdueGoals = goals.filter((g) => isGoalOverdue(g));

  const GoalForm = () => (
    <div className="space-y-4">
      <div>
        <Label htmlFor="goal-title">Goal Title</Label>
        <Input
          id="goal-title"
          placeholder="Enter goal title..."
          value={goalForm.title}
          onChange={(e) => setGoalForm({ ...goalForm, title: e.target.value })}
        />
      </div>

      <div>
        <Label htmlFor="goal-description">Description</Label>
        <Textarea
          id="goal-description"
          placeholder="Describe the goal in detail..."
          value={goalForm.description}
          onChange={(e) =>
            setGoalForm({ ...goalForm, description: e.target.value })
          }
          rows={3}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="target-date">Target Date</Label>
          <Input
            id="target-date"
            type="date"
            value={goalForm.target_date}
            onChange={(e) =>
              setGoalForm({ ...goalForm, target_date: e.target.value })
            }
          />
        </div>
        <div>
          <Label htmlFor="goal-status">Status</Label>
          <Select
            value={goalForm.status}
            onValueChange={(value: Goal["status"]) =>
              setGoalForm({ ...goalForm, status: value })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="not_started">Not Started</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="overdue">Overdue</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label htmlFor="progress">
          Progress ({goalForm.progress_percentage}%)
        </Label>
        <div className="flex items-center gap-4 mt-2">
          <Input
            id="progress"
            type="range"
            min="0"
            max="100"
            value={goalForm.progress_percentage}
            onChange={(e) =>
              setGoalForm({
                ...goalForm,
                progress_percentage: Number(e.target.value),
              })
            }
            className="flex-1"
            disabled={goalForm.status === "completed"}
          />
          <Input
            type="number"
            min="0"
            max="100"
            value={goalForm.progress_percentage}
            onChange={(e) =>
              setGoalForm({
                ...goalForm,
                progress_percentage: Number(e.target.value),
              })
            }
            className="w-20"
            disabled={goalForm.status === "completed"}
          />
        </div>
        <Progress value={goalForm.progress_percentage} className="mt-2" />
      </div>

      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={
            editingGoal ? cancelEditing : () => setIsCreateDialogOpen(false)
          }
        >
          Cancel
        </Button>
        <Button
          type="button"
          onClick={editingGoal ? handleUpdateGoal : handleCreateGoal}
          disabled={!goalForm.title.trim() || isLoading}
        >
          {editingGoal ? "Update Goal" : "Create Goal"}
        </Button>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Target className="h-6 w-6" />
            Goal Tracker
          </h2>
          <p className="text-muted-foreground">
            Track and manage goals for {staffName}
          </p>
        </div>
        {canEdit && (
          <Dialog
            open={isCreateDialogOpen}
            onOpenChange={setIsCreateDialogOpen}
          >
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Goal
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create New Goal</DialogTitle>
              </DialogHeader>
              <GoalForm />
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Goal Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-blue-500" />
              <div>
                <p className="text-sm font-medium">Total Goals</p>
                <p className="text-2xl font-bold">{goals.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-500" />
              <div>
                <p className="text-sm font-medium">Active Goals</p>
                <p className="text-2xl font-bold">{activeGoals.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <div>
                <p className="text-sm font-medium">Completed</p>
                <p className="text-2xl font-bold">{completedGoals.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <div>
                <p className="text-sm font-medium">Overdue</p>
                <p className="text-2xl font-bold">{overdueGoals.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Active Goals */}
      {activeGoals.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Active Goals</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {activeGoals.map((goal) => {
              const daysUntilTarget = getDaysUntilTarget(goal.target_date);
              const isOverdue = isGoalOverdue(goal);

              return (
                <div key={goal.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        {getStatusIcon(goal.status)}
                        <h3 className="font-semibold">{goal.title}</h3>
                        <Badge className={getStatusColor(goal.status)}>
                          {goal.status.replace("_", " ").toUpperCase()}
                        </Badge>
                      </div>

                      {goal.description && (
                        <p className="text-sm text-muted-foreground mb-3">
                          {goal.description}
                        </p>
                      )}

                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span>Progress</span>
                          <span>{goal.progress_percentage}%</span>
                        </div>
                        <Progress value={goal.progress_percentage} />
                      </div>

                      <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          <span>
                            Target:{" "}
                            {new Date(goal.target_date).toLocaleDateString()}
                          </span>
                        </div>
                        <div
                          className={`flex items-center gap-1 ${
                            isOverdue
                              ? "text-red-600"
                              : daysUntilTarget <= 7
                              ? "text-orange-600"
                              : ""
                          }`}
                        >
                          <Clock className="h-4 w-4" />
                          <span>
                            {isOverdue
                              ? `${Math.abs(daysUntilTarget)} days overdue`
                              : `${daysUntilTarget} days remaining`}
                          </span>
                        </div>
                      </div>
                    </div>

                    {canEdit && (
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => startEditing(goal)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onDeleteGoal(goal.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Completed Goals */}
      {completedGoals.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Completed Goals</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {completedGoals.map((goal) => (
              <div
                key={goal.id}
                className="border rounded-lg p-4 space-y-3 opacity-75"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <h3 className="font-semibold line-through">
                        {goal.title}
                      </h3>
                      <Badge className="bg-green-100 text-green-800">
                        COMPLETED
                      </Badge>
                    </div>

                    {goal.description && (
                      <p className="text-sm text-muted-foreground mb-3">
                        {goal.description}
                      </p>
                    )}

                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        <span>
                          Completed:{" "}
                          {new Date(goal.target_date).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  {canEdit && (
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => startEditing(goal)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onDeleteGoal(goal.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {goals.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Goals Set</h3>
            <p className="text-muted-foreground mb-4">
              Start tracking progress by creating the first goal for {staffName}
              .
            </p>
            {canEdit && (
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create First Goal
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Edit Goal Dialog */}
      <Dialog
        open={!!editingGoal}
        onOpenChange={(open) => !open && cancelEditing()}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Goal</DialogTitle>
          </DialogHeader>
          <GoalForm />
        </DialogContent>
      </Dialog>
    </div>
  );
}
