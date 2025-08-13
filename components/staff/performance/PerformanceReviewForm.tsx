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
import { Separator } from "@/components/ui/separator";
import { Star, Plus, Trash2, Save, Send, AlertTriangle } from "lucide-react";
import {
  StaffPerformanceReview,
  PerformanceMetric,
  Goal,
  Achievement,
  ReviewStatus,
} from "@/types/staff";
import { FormErrorDisplay } from "@/components/shared/FormErrorDisplay";
import {
  LoadingButton,
  FormLoadingOverlay,
} from "@/components/shared/LoadingStates";

interface PerformanceReviewFormProps {
  staffId: string;
  staffName: string;
  businessId: string;
  reviewerId: string;
  existingReview?: StaffPerformanceReview;
  onSave: (reviewData: Partial<StaffPerformanceReview>) => Promise<void>;
  onSubmit: (reviewData: Partial<StaffPerformanceReview>) => Promise<void>;
  isLoading?: boolean;
}

const defaultMetrics: PerformanceMetric[] = [
  { name: "Quality of Work", score: 0, max_score: 5 },
  { name: "Productivity", score: 0, max_score: 5 },
  { name: "Communication", score: 0, max_score: 5 },
  { name: "Teamwork", score: 0, max_score: 5 },
  { name: "Reliability", score: 0, max_score: 5 },
];

export function PerformanceReviewForm({
  staffId,
  staffName,
  businessId,
  reviewerId,
  existingReview,
  onSave,
  onSubmit,
  isLoading = false,
}: PerformanceReviewFormProps) {
  const [reviewData, setReviewData] = useState<Partial<StaffPerformanceReview>>(
    {
      staff_id: staffId,
      business_id: businessId,
      reviewer_id: reviewerId,
      review_period_start: "",
      review_period_end: "",
      overall_rating: undefined,
      performance_metrics: defaultMetrics,
      goals: [],
      achievements: [],
      areas_for_improvement: "",
      comments: "",
      status: "draft" as ReviewStatus,
    }
  );

  const [validationErrors, setValidationErrors] = useState<
    Record<string, string>
  >({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (existingReview) {
      setReviewData({
        ...existingReview,
        performance_metrics:
          existingReview.performance_metrics.length > 0
            ? existingReview.performance_metrics
            : defaultMetrics,
      });
    }
  }, [existingReview]);

  const handleMetricChange = (
    index: number,
    field: keyof PerformanceMetric,
    value: string | number
  ) => {
    const updatedMetrics = [...(reviewData.performance_metrics || [])];
    updatedMetrics[index] = {
      ...updatedMetrics[index],
      [field]:
        field === "score" || field === "max_score" ? Number(value) : value,
    };
    setReviewData({ ...reviewData, performance_metrics: updatedMetrics });
  };

  const addGoal = () => {
    const newGoal: Goal = {
      id: `goal_${Date.now()}`,
      title: "",
      description: "",
      target_date: "",
      status: "not_started",
      progress_percentage: 0,
    };
    setReviewData({
      ...reviewData,
      goals: [...(reviewData.goals || []), newGoal],
    });
  };

  const updateGoal = (
    index: number,
    field: keyof Goal,
    value: string | number
  ) => {
    const updatedGoals = [...(reviewData.goals || [])];
    updatedGoals[index] = {
      ...updatedGoals[index],
      [field]: value,
    };
    setReviewData({ ...reviewData, goals: updatedGoals });
  };

  const removeGoal = (index: number) => {
    const updatedGoals = [...(reviewData.goals || [])];
    updatedGoals.splice(index, 1);
    setReviewData({ ...reviewData, goals: updatedGoals });
  };

  const addAchievement = () => {
    const newAchievement: Achievement = {
      id: `achievement_${Date.now()}`,
      title: "",
      description: "",
      date_achieved: new Date().toISOString().split("T")[0],
      recognition_type: "milestone",
    };
    setReviewData({
      ...reviewData,
      achievements: [...(reviewData.achievements || []), newAchievement],
    });
  };

  const updateAchievement = (
    index: number,
    field: keyof Achievement,
    value: string
  ) => {
    const updatedAchievements = [...(reviewData.achievements || [])];
    updatedAchievements[index] = {
      ...updatedAchievements[index],
      [field]: value,
    };
    setReviewData({ ...reviewData, achievements: updatedAchievements });
  };

  const removeAchievement = (index: number) => {
    const updatedAchievements = [...(reviewData.achievements || [])];
    updatedAchievements.splice(index, 1);
    setReviewData({ ...reviewData, achievements: updatedAchievements });
  };

  const calculateOverallRating = () => {
    const metrics = reviewData.performance_metrics || [];
    if (metrics.length === 0) return 0;

    const totalScore = metrics.reduce((sum, metric) => sum + metric.score, 0);
    const maxPossibleScore = metrics.reduce(
      (sum, metric) => sum + metric.max_score,
      0
    );

    return maxPossibleScore > 0
      ? Math.round((totalScore / maxPossibleScore) * 5 * 100) / 100
      : 0;
  };

  useEffect(() => {
    const calculatedRating = calculateOverallRating();
    if (calculatedRating !== reviewData.overall_rating) {
      setReviewData({ ...reviewData, overall_rating: calculatedRating });
    }
  }, [reviewData.performance_metrics]);

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    // Validate review period
    if (!reviewData.review_period_start) {
      errors.review_period_start = "Review period start date is required";
    }

    if (!reviewData.review_period_end) {
      errors.review_period_end = "Review period end date is required";
    }

    if (reviewData.review_period_start && reviewData.review_period_end) {
      const startDate = new Date(reviewData.review_period_start);
      const endDate = new Date(reviewData.review_period_end);

      if (endDate <= startDate) {
        errors.review_period_end = "End date must be after start date";
      }
    }

    // Validate performance metrics
    const metrics = reviewData.performance_metrics || [];
    if (metrics.length === 0) {
      errors.performance_metrics =
        "At least one performance metric is required";
    } else {
      metrics.forEach((metric, index) => {
        if (!metric.name) {
          errors[`metric_${index}_name`] = "Metric name is required";
        }
        if (metric.score < 0 || metric.score > metric.max_score) {
          errors[`metric_${index}_score`] =
            "Score must be between 0 and maximum score";
        }
      });
    }

    // Validate goals
    const goals = reviewData.goals || [];
    goals.forEach((goal, index) => {
      if (!goal.title) {
        errors[`goal_${index}_title`] = "Goal title is required";
      }
      if (goal.target_date && new Date(goal.target_date) <= new Date()) {
        errors[`goal_${index}_target_date`] =
          "Target date must be in the future";
      }
    });

    // Validate achievements
    const achievements = reviewData.achievements || [];
    achievements.forEach((achievement, index) => {
      if (!achievement.title) {
        errors[`achievement_${index}_title`] = "Achievement title is required";
      }
      if (
        achievement.date_achieved &&
        new Date(achievement.date_achieved) > new Date()
      ) {
        errors[`achievement_${index}_date_achieved`] =
          "Achievement date cannot be in the future";
      }
    });

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSaveReview = async () => {
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onSave(reviewData);
      setValidationErrors({});
    } catch (error) {
      console.error("Error saving review:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitReview = async () => {
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(reviewData);
      setValidationErrors({});
    } catch (error) {
      console.error("Error submitting review:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStarRating = (rating: number, maxRating: number = 5) => {
    return (
      <div className="flex items-center gap-1">
        {Array.from({ length: maxRating }, (_, i) => (
          <Star
            key={i}
            className={`h-4 w-4 ${
              i < Math.floor(rating)
                ? "fill-yellow-400 text-yellow-400"
                : i < rating
                ? "fill-yellow-200 text-yellow-400"
                : "text-gray-300"
            }`}
          />
        ))}
        <span className="ml-2 text-sm font-medium">{rating.toFixed(1)}</span>
      </div>
    );
  };

  return (
    <FormLoadingOverlay isLoading={isSubmitting} message="Saving review...">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Performance Review</h2>
            <p className="text-muted-foreground">
              Performance evaluation for {staffName}
            </p>
          </div>
          <Badge
            variant={reviewData.status === "approved" ? "default" : "secondary"}
          >
            {reviewData.status?.toUpperCase()}
          </Badge>
        </div>

        {/* Form Errors */}
        <FormErrorDisplay
          errors={validationErrors}
          onDismiss={() => setValidationErrors({})}
        />

        {/* Review Period */}
        <Card>
          <CardHeader>
            <CardTitle>Review Period</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="start-date">Start Date</Label>
                <Input
                  id="start-date"
                  type="date"
                  value={reviewData.review_period_start || ""}
                  onChange={(e) =>
                    setReviewData({
                      ...reviewData,
                      review_period_start: e.target.value,
                    })
                  }
                  disabled={reviewData.status === "approved" || isSubmitting}
                  className={
                    validationErrors.review_period_start ? "border-red-500" : ""
                  }
                />
                {validationErrors.review_period_start && (
                  <p className="text-sm text-red-600 mt-1">
                    {validationErrors.review_period_start}
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor="end-date">End Date</Label>
                <Input
                  id="end-date"
                  type="date"
                  value={reviewData.review_period_end || ""}
                  onChange={(e) =>
                    setReviewData({
                      ...reviewData,
                      review_period_end: e.target.value,
                    })
                  }
                  disabled={reviewData.status === "approved" || isSubmitting}
                  className={
                    validationErrors.review_period_end ? "border-red-500" : ""
                  }
                />
                {validationErrors.review_period_end && (
                  <p className="text-sm text-red-600 mt-1">
                    {validationErrors.review_period_end}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Performance Metrics */}
        <Card>
          <CardHeader>
            <CardTitle>Performance Metrics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {(reviewData.performance_metrics || []).map((metric, index) => (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="font-medium">{metric.name}</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min="0"
                      max={metric.max_score}
                      value={metric.score}
                      onChange={(e) =>
                        handleMetricChange(index, "score", e.target.value)
                      }
                      className="w-16"
                      disabled={reviewData.status === "approved"}
                    />
                    <span className="text-sm text-muted-foreground">
                      / {metric.max_score}
                    </span>
                  </div>
                </div>
                {metric.comments && (
                  <Textarea
                    placeholder="Comments for this metric..."
                    value={metric.comments || ""}
                    onChange={(e) =>
                      handleMetricChange(index, "comments", e.target.value)
                    }
                    disabled={reviewData.status === "approved"}
                    className="text-sm"
                  />
                )}
              </div>
            ))}

            <Separator />

            <div className="flex items-center justify-between">
              <Label className="text-lg font-semibold">Overall Rating</Label>
              {renderStarRating(reviewData.overall_rating || 0)}
            </div>
          </CardContent>
        </Card>

        {/* Goals */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Goals
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addGoal}
                disabled={reviewData.status === "approved"}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Goal
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {(reviewData.goals || []).map((goal, index) => (
              <div key={goal.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <Input
                    placeholder="Goal title..."
                    value={goal.title}
                    onChange={(e) => updateGoal(index, "title", e.target.value)}
                    disabled={reviewData.status === "approved"}
                    className="font-medium"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeGoal(index)}
                    disabled={reviewData.status === "approved"}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                <Textarea
                  placeholder="Goal description..."
                  value={goal.description}
                  onChange={(e) =>
                    updateGoal(index, "description", e.target.value)
                  }
                  disabled={reviewData.status === "approved"}
                />

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Target Date</Label>
                    <Input
                      type="date"
                      value={goal.target_date}
                      onChange={(e) =>
                        updateGoal(index, "target_date", e.target.value)
                      }
                      disabled={reviewData.status === "approved"}
                    />
                  </div>
                  <div>
                    <Label>Status</Label>
                    <Select
                      value={goal.status}
                      onValueChange={(value) =>
                        updateGoal(index, "status", value)
                      }
                      disabled={reviewData.status === "approved"}
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
              </div>
            ))}

            {(reviewData.goals || []).length === 0 && (
              <p className="text-center text-muted-foreground py-8">
                No goals set for this review period. Click "Add Goal" to create
                one.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Achievements */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Achievements
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addAchievement}
                disabled={reviewData.status === "approved"}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Achievement
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {(reviewData.achievements || []).map((achievement, index) => (
              <div
                key={achievement.id}
                className="border rounded-lg p-4 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <Input
                    placeholder="Achievement title..."
                    value={achievement.title}
                    onChange={(e) =>
                      updateAchievement(index, "title", e.target.value)
                    }
                    disabled={reviewData.status === "approved"}
                    className="font-medium"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeAchievement(index)}
                    disabled={reviewData.status === "approved"}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                <Textarea
                  placeholder="Achievement description..."
                  value={achievement.description}
                  onChange={(e) =>
                    updateAchievement(index, "description", e.target.value)
                  }
                  disabled={reviewData.status === "approved"}
                />

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Date Achieved</Label>
                    <Input
                      type="date"
                      value={achievement.date_achieved}
                      onChange={(e) =>
                        updateAchievement(
                          index,
                          "date_achieved",
                          e.target.value
                        )
                      }
                      disabled={reviewData.status === "approved"}
                    />
                  </div>
                  <div>
                    <Label>Recognition Type</Label>
                    <Select
                      value={achievement.recognition_type}
                      onValueChange={(value) =>
                        updateAchievement(index, "recognition_type", value)
                      }
                      disabled={reviewData.status === "approved"}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="commendation">
                          Commendation
                        </SelectItem>
                        <SelectItem value="award">Award</SelectItem>
                        <SelectItem value="milestone">Milestone</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            ))}

            {(reviewData.achievements || []).length === 0 && (
              <p className="text-center text-muted-foreground py-8">
                No achievements recorded for this review period. Click "Add
                Achievement" to create one.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Areas for Improvement & Comments */}
        <Card>
          <CardHeader>
            <CardTitle>Additional Feedback</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="improvements">Areas for Improvement</Label>
              <Textarea
                id="improvements"
                placeholder="Identify specific areas where the employee can improve..."
                value={reviewData.areas_for_improvement || ""}
                onChange={(e) =>
                  setReviewData({
                    ...reviewData,
                    areas_for_improvement: e.target.value,
                  })
                }
                disabled={reviewData.status === "approved"}
                rows={4}
              />
            </div>

            <div>
              <Label htmlFor="comments">General Comments</Label>
              <Textarea
                id="comments"
                placeholder="Additional comments about the employee's performance..."
                value={reviewData.comments || ""}
                onChange={(e) =>
                  setReviewData({ ...reviewData, comments: e.target.value })
                }
                disabled={reviewData.status === "approved"}
                rows={4}
              />
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        {reviewData.status !== "approved" && (
          <div className="flex justify-end gap-4">
            <LoadingButton
              type="button"
              variant="outline"
              onClick={handleSaveReview}
              isLoading={isSubmitting}
              loadingText="Saving..."
              icon="save"
              disabled={isLoading}
            >
              Save Draft
            </LoadingButton>

            <LoadingButton
              type="button"
              onClick={handleSubmitReview}
              isLoading={isSubmitting}
              loadingText="Submitting..."
              icon="send"
              disabled={
                isLoading ||
                !reviewData.review_period_start ||
                !reviewData.review_period_end ||
                Object.keys(validationErrors).length > 0
              }
            >
              Submit Review
            </LoadingButton>
          </div>
        )}
      </div>
    </FormLoadingOverlay>
  );
}
