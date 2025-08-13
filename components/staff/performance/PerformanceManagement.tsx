"use client";

import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  BarChart3,
  Target,
  GraduationCap,
  TrendingUp,
  Award,
} from "lucide-react";

import { PerformanceReviewForm } from "./PerformanceReviewForm";
import { GoalTracker } from "./GoalTracker";
import { TrainingCertificationManager } from "./TrainingCertificationManager";
import { PerformanceAnalytics } from "./PerformanceAnalytics";

import {
  StaffPerformanceReview,
  Goal,
  Staff,
  StaffDocument,
} from "@/types/staff";
import { toast } from "sonner";

// Mock training record type (would be defined in types/staff.d.ts)
interface TrainingRecord {
  id: string;
  title: string;
  description: string;
  provider: string;
  completion_date: string;
  expiration_date?: string;
  certificate_url?: string;
  status: "completed" | "in_progress" | "expired" | "pending";
  hours: number;
  category: "safety" | "technical" | "soft_skills" | "compliance" | "other";
}

interface PerformanceManagementProps {
  staff: Staff;
  businessId: string;
  reviewerId: string;
  canEdit?: boolean;
}

export function PerformanceManagement({
  staff,
  businessId,
  reviewerId,
  canEdit = true,
}: PerformanceManagementProps) {
  const [activeTab, setActiveTab] = useState("overview");
  const [isLoading, setIsLoading] = useState(false);

  // State for performance data
  const [performanceReviews, setPerformanceReviews] = useState<
    StaffPerformanceReview[]
  >([]);
  const [currentReview, setCurrentReview] =
    useState<StaffPerformanceReview | null>(null);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [trainingRecords, setTrainingRecords] = useState<TrainingRecord[]>([]);
  const [certificationDocuments, setCertificationDocuments] = useState<
    StaffDocument[]
  >([]);

  // Load performance data
  useEffect(() => {
    loadPerformanceData();
  }, [staff.id, businessId]);

  const loadPerformanceData = async () => {
    setIsLoading(true);
    try {
      // In a real implementation, these would be API calls
      // For now, we'll use mock data

      // Mock performance reviews
      const mockReviews: StaffPerformanceReview[] = [
        {
          id: "review_1",
          staff_id: staff.id,
          business_id: businessId,
          reviewer_id: reviewerId,
          review_period_start: "2024-01-01",
          review_period_end: "2024-06-30",
          overall_rating: 4.2,
          performance_metrics: [
            {
              name: "Quality of Work",
              score: 4,
              max_score: 5,
              comments: "Excellent attention to detail",
            },
            {
              name: "Productivity",
              score: 4,
              max_score: 5,
              comments: "Consistently meets targets",
            },
            {
              name: "Communication",
              score: 5,
              max_score: 5,
              comments: "Great team communication",
            },
            {
              name: "Teamwork",
              score: 4,
              max_score: 5,
              comments: "Collaborative and supportive",
            },
            {
              name: "Reliability",
              score: 4,
              max_score: 5,
              comments: "Very dependable",
            },
          ],
          goals: [
            {
              id: "goal_1",
              title: "Improve customer service response time",
              description: "Reduce average response time to under 2 minutes",
              target_date: "2024-12-31",
              status: "in_progress",
              progress_percentage: 75,
            },
            {
              id: "goal_2",
              title: "Complete advanced training certification",
              description:
                "Obtain certification in advanced customer service techniques",
              target_date: "2024-09-30",
              status: "completed",
              progress_percentage: 100,
            },
          ],
          achievements: [
            {
              id: "achievement_1",
              title: "Employee of the Month",
              description: "Recognized for outstanding customer service",
              date_achieved: "2024-03-15",
              recognition_type: "award",
            },
          ],
          areas_for_improvement:
            "Could benefit from additional technical training",
          comments: "Overall excellent performance with strong customer focus",
          status: "approved",
          created_at: "2024-07-01T00:00:00Z",
          updated_at: "2024-07-01T00:00:00Z",
        },
      ];

      // Mock training records
      const mockTraining: TrainingRecord[] = [
        {
          id: "training_1",
          title: "Customer Service Excellence",
          description:
            "Advanced customer service techniques and best practices",
          provider: "Training Institute",
          completion_date: "2024-03-15",
          expiration_date: "2026-03-15",
          status: "completed",
          hours: 16,
          category: "soft_skills",
          certificate_url: "/certificates/customer-service.pdf",
        },
        {
          id: "training_2",
          title: "Food Safety Certification",
          description: "Food handling and safety protocols",
          provider: "Health Department",
          completion_date: "2024-01-10",
          expiration_date: "2025-01-10",
          status: "completed",
          hours: 8,
          category: "safety",
          certificate_url: "/certificates/food-safety.pdf",
        },
      ];

      setPerformanceReviews(mockReviews);
      setGoals(mockReviews.flatMap((r) => r.goals as Goal[]));
      setTrainingRecords(mockTraining);
      setCertificationDocuments([]);
    } catch (error) {
      console.error("Error loading performance data:", error);
      toast.error("Failed to load performance data");
    } finally {
      setIsLoading(false);
    }
  };

  // Performance review handlers
  const handleSaveReview = async (
    reviewData: Partial<StaffPerformanceReview>
  ) => {
    setIsLoading(true);
    try {
      // In a real implementation, this would be an API call
      console.log("Saving review:", reviewData);

      toast.success("Performance review saved as draft");
    } catch (error) {
      console.error("Error saving review:", error);
      toast.error("Failed to save performance review");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitReview = async (
    reviewData: Partial<StaffPerformanceReview>
  ) => {
    setIsLoading(true);
    try {
      // In a real implementation, this would be an API call
      console.log("Submitting review:", reviewData);

      toast.success("Performance review submitted successfully");

      await loadPerformanceData();
    } catch (error) {
      console.error("Error submitting review:", error);
      toast.error("Failed to submit performance review");
    } finally {
      setIsLoading(false);
    }
  };

  // Goal management handlers
  const handleCreateGoal = async (goal: Omit<Goal, "id">) => {
    setIsLoading(true);
    try {
      const newGoal: Goal = {
        ...goal,
        id: `goal_${Date.now()}`,
      };

      setGoals((prev) => [...prev, newGoal]);

      toast.success("Goal created successfully");
    } catch (error) {
      console.error("Error creating goal:", error);
      toast.error("Failed to create goal");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateGoal = async (goal: Goal) => {
    setIsLoading(true);
    try {
      setGoals((prev) => prev.map((g) => (g.id === goal.id ? goal : g)));

      toast.success("Goal updated successfully");
    } catch (error) {
      console.error("Error updating goal:", error);
      toast.error("Failed to update goal");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteGoal = async (goalId: string) => {
    setIsLoading(true);
    try {
      setGoals((prev) => prev.filter((g) => g.id !== goalId));

      toast.success("Goal deleted successfully");
    } catch (error) {
      console.error("Error deleting goal:", error);
      toast.error("Failed to delete goal");
    } finally {
      setIsLoading(false);
    }
  };

  // Training management handlers
  const handleAddTraining = async (training: Omit<TrainingRecord, "id">) => {
    setIsLoading(true);
    try {
      const newTraining: TrainingRecord = {
        ...training,
        id: `training_${Date.now()}`,
      };

      setTrainingRecords((prev) => [...prev, newTraining]);

      toast.success("Training record added successfully");
    } catch (error) {
      console.error("Error adding training:", error);
      toast.error("Failed to add training record");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateTraining = async (training: TrainingRecord) => {
    setIsLoading(true);
    try {
      setTrainingRecords((prev) =>
        prev.map((t) => (t.id === training.id ? training : t))
      );

      toast.success("Training record updated successfully");
    } catch (error) {
      console.error("Error updating training:", error);
      toast.error("Failed to update training record");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteTraining = async (trainingId: string) => {
    setIsLoading(true);
    try {
      setTrainingRecords((prev) => prev.filter((t) => t.id !== trainingId));

      toast.success("Training record deleted successfully");
    } catch (error) {
      console.error("Error deleting training:", error);
      toast.error("Failed to delete training record");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUploadCertificate = async (file: File, trainingId: string) => {
    setIsLoading(true);
    try {
      // In a real implementation, this would upload the file and return a URL
      const mockUrl = `/certificates/${file.name}`;

      setTrainingRecords((prev) =>
        prev.map((t) =>
          t.id === trainingId ? { ...t, certificate_url: mockUrl } : t
        )
      );

      toast.success("Certificate uploaded successfully");
    } catch (error) {
      console.error("Error uploading certificate:", error);
      toast.error("Failed to upload certificate");
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportReport = async () => {
    setIsLoading(true);
    try {
      // In a real implementation, this would generate and download a report
      console.log(
        "Exporting performance report for:",
        staff.first_name,
        staff.last_name
      );

      toast.success("Performance report exported successfully");
    } catch (error) {
      console.error("Error exporting report:", error);
      toast.error("Failed to export performance report");
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate summary statistics
  const latestReview = performanceReviews
    .filter((r) => r.status === "approved")
    .sort(
      (a, b) =>
        new Date(b.review_period_end).getTime() -
        new Date(a.review_period_end).getTime()
    )[0];

  const activeGoals = goals.filter(
    (g) => g.status === "in_progress" || g.status === "not_started"
  );
  const completedGoals = goals.filter((g) => g.status === "completed");
  const completedTrainings = trainingRecords.filter(
    (t) => t.status === "completed"
  );
  const totalTrainingHours = trainingRecords.reduce(
    (sum, t) => sum + t.hours,
    0
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Performance Management</h1>
          <p className="text-muted-foreground">
            Comprehensive performance tracking for {staff.first_name}{" "}
            {staff.last_name}
          </p>
        </div>
        <Badge variant="outline" className="text-sm">
          {staff.role.toUpperCase()}
        </Badge>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-blue-500" />
              <div>
                <p className="text-sm font-medium">Latest Rating</p>
                <p className="text-2xl font-bold">
                  {latestReview?.overall_rating?.toFixed(1) || "N/A"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-green-500" />
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
              <GraduationCap className="h-4 w-4 text-purple-500" />
              <div>
                <p className="text-sm font-medium">Training Hours</p>
                <p className="text-2xl font-bold">{totalTrainingHours}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Award className="h-4 w-4 text-orange-500" />
              <div>
                <p className="text-sm font-medium">Completed Goals</p>
                <p className="text-2xl font-bold">{completedGoals.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-4"
      >
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="reviews">Reviews</TabsTrigger>
          <TabsTrigger value="goals">Goals</TabsTrigger>
          <TabsTrigger value="training">Training</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Performance */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Recent Performance
                </CardTitle>
              </CardHeader>
              <CardContent>
                {latestReview ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">Overall Rating</span>
                      <Badge>
                        {latestReview.overall_rating?.toFixed(1)}/5.0
                      </Badge>
                    </div>
                    <div className="space-y-2">
                      <span className="font-medium">Review Period</span>
                      <p className="text-sm text-muted-foreground">
                        {new Date(
                          latestReview.review_period_start
                        ).toLocaleDateString()}{" "}
                        -{" "}
                        {new Date(
                          latestReview.review_period_end
                        ).toLocaleDateString()}
                      </p>
                    </div>
                    {latestReview.comments && (
                      <div className="space-y-2">
                        <span className="font-medium">Comments</span>
                        <p className="text-sm text-muted-foreground">
                          {latestReview.comments}
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">
                    No performance reviews available
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Active Goals Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Active Goals
                </CardTitle>
              </CardHeader>
              <CardContent>
                {activeGoals.length > 0 ? (
                  <div className="space-y-3">
                    {activeGoals.slice(0, 3).map((goal) => (
                      <div key={goal.id} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-sm">
                            {goal.title}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {goal.progress_percentage}%
                          </Badge>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full"
                            style={{ width: `${goal.progress_percentage}%` }}
                          />
                        </div>
                      </div>
                    ))}
                    {activeGoals.length > 3 && (
                      <p className="text-sm text-muted-foreground text-center">
                        +{activeGoals.length - 3} more goals
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">
                    No active goals
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="reviews">
          <PerformanceReviewForm
            staffId={staff.id}
            staffName={`${staff.first_name} ${staff.last_name}`}
            businessId={businessId}
            reviewerId={reviewerId}
            existingReview={currentReview || undefined}
            onSave={handleSaveReview}
            onSubmit={handleSubmitReview}
            isLoading={isLoading}
          />
        </TabsContent>

        <TabsContent value="goals">
          <GoalTracker
            staffId={staff.id}
            staffName={`${staff.first_name} ${staff.last_name}`}
            businessId={businessId}
            goals={goals}
            onUpdateGoal={handleUpdateGoal}
            onDeleteGoal={handleDeleteGoal}
            onCreateGoal={handleCreateGoal}
            isLoading={isLoading}
            canEdit={canEdit}
          />
        </TabsContent>

        <TabsContent value="training">
          <TrainingCertificationManager
            staffId={staff.id}
            staffName={`${staff.first_name} ${staff.last_name}`}
            businessId={businessId}
            trainingRecords={trainingRecords}
            certificationDocuments={certificationDocuments}
            onAddTraining={handleAddTraining}
            onUpdateTraining={handleUpdateTraining}
            onDeleteTraining={handleDeleteTraining}
            onUploadCertificate={handleUploadCertificate}
            isLoading={isLoading}
            canEdit={canEdit}
          />
        </TabsContent>

        <TabsContent value="analytics">
          <PerformanceAnalytics
            staffId={staff.id}
            staffName={`${staff.first_name} ${staff.last_name}`}
            businessId={businessId}
            performanceReviews={performanceReviews}
            onExportReport={handleExportReport}
            isLoading={isLoading}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
