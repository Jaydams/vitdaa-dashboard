"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Target,
  Award,
  Calendar,
  Star,
  Download,
  Filter,
} from "lucide-react";
import {
  StaffPerformanceReview,
  Goal,
  Achievement,
  PerformanceMetric,
} from "@/types/staff";

interface PerformanceAnalyticsProps {
  staffId: string;
  staffName: string;
  businessId: string;
  performanceReviews: StaffPerformanceReview[];
  onExportReport?: () => Promise<void>;
  isLoading?: boolean;
}

interface PerformanceStats {
  averageRating: number;
  ratingTrend: "improving" | "stable" | "declining";
  totalReviews: number;
  completedGoals: number;
  totalGoals: number;
  achievements: number;
  lastReviewDate?: string;
  nextReviewDue?: string;
}

interface MetricAnalysis {
  name: string;
  currentScore: number;
  previousScore: number;
  maxScore: number;
  trend: "up" | "down" | "stable";
  improvement: number;
}

export function PerformanceAnalytics({
  staffId,
  staffName,
  businessId,
  performanceReviews,
  onExportReport,
  isLoading = false,
}: PerformanceAnalyticsProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<string>("all");
  const [selectedMetric, setSelectedMetric] = useState<string>("all");

  // Filter reviews based on selected period
  const filteredReviews = useMemo(() => {
    if (selectedPeriod === "all") return performanceReviews;

    const now = new Date();
    const cutoffDate = new Date();

    switch (selectedPeriod) {
      case "6months":
        cutoffDate.setMonth(now.getMonth() - 6);
        break;
      case "1year":
        cutoffDate.setFullYear(now.getFullYear() - 1);
        break;
      case "2years":
        cutoffDate.setFullYear(now.getFullYear() - 2);
        break;
      default:
        return performanceReviews;
    }

    return performanceReviews.filter(
      (review) => new Date(review.review_period_end) >= cutoffDate
    );
  }, [performanceReviews, selectedPeriod]);

  // Calculate performance statistics
  const performanceStats = useMemo((): PerformanceStats => {
    const approvedReviews = filteredReviews.filter(
      (r) => r.status === "approved"
    );
    const ratedReviews = approvedReviews.filter(
      (r) => r.overall_rating !== null
    );

    if (ratedReviews.length === 0) {
      return {
        averageRating: 0,
        ratingTrend: "stable",
        totalReviews: filteredReviews.length,
        completedGoals: 0,
        totalGoals: 0,
        achievements: 0,
      };
    }

    const ratings = ratedReviews.map((r) => r.overall_rating!);
    const averageRating =
      ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length;

    // Calculate trend
    let ratingTrend: "improving" | "stable" | "declining" = "stable";
    if (ratedReviews.length >= 2) {
      const sortedReviews = [...ratedReviews].sort(
        (a, b) =>
          new Date(a.review_period_end).getTime() -
          new Date(b.review_period_end).getTime()
      );
      const firstRating = sortedReviews[0].overall_rating!;
      const lastRating =
        sortedReviews[sortedReviews.length - 1].overall_rating!;
      const change = lastRating - firstRating;

      if (change > 0.5) ratingTrend = "improving";
      else if (change < -0.5) ratingTrend = "declining";
    }

    // Calculate goals and achievements
    const allGoals = filteredReviews.flatMap((r) => r.goals as Goal[]);
    const completedGoals = allGoals.filter(
      (g) => g.status === "completed"
    ).length;
    const allAchievements = filteredReviews.flatMap(
      (r) => r.achievements as Achievement[]
    );

    const latestReview = approvedReviews.sort(
      (a, b) =>
        new Date(b.review_period_end).getTime() -
        new Date(a.review_period_end).getTime()
    )[0];

    return {
      averageRating: Math.round(averageRating * 100) / 100,
      ratingTrend,
      totalReviews: filteredReviews.length,
      completedGoals,
      totalGoals: allGoals.length,
      achievements: allAchievements.length,
      lastReviewDate: latestReview?.review_period_end,
    };
  }, [filteredReviews]);

  // Analyze performance metrics trends
  const metricAnalysis = useMemo((): MetricAnalysis[] => {
    const approvedReviews = filteredReviews
      .filter((r) => r.status === "approved")
      .sort(
        (a, b) =>
          new Date(a.review_period_end).getTime() -
          new Date(b.review_period_end).getTime()
      );

    if (approvedReviews.length < 2) return [];

    const latestReview = approvedReviews[approvedReviews.length - 1];
    const previousReview = approvedReviews[approvedReviews.length - 2];

    const latestMetrics =
      latestReview.performance_metrics as PerformanceMetric[];
    const previousMetrics =
      previousReview.performance_metrics as PerformanceMetric[];

    const analysis: MetricAnalysis[] = [];

    latestMetrics.forEach((currentMetric) => {
      const previousMetric = previousMetrics.find(
        (m) => m.name === currentMetric.name
      );
      if (!previousMetric) return;

      const improvement = currentMetric.score - previousMetric.score;
      let trend: "up" | "down" | "stable" = "stable";

      if (improvement > 0.2) trend = "up";
      else if (improvement < -0.2) trend = "down";

      analysis.push({
        name: currentMetric.name,
        currentScore: currentMetric.score,
        previousScore: previousMetric.score,
        maxScore: currentMetric.max_score,
        trend,
        improvement,
      });
    });

    return selectedMetric === "all"
      ? analysis
      : analysis.filter((m) =>
          m.name.toLowerCase().includes(selectedMetric.toLowerCase())
        );
  }, [filteredReviews, selectedMetric]);

  // Get recent achievements
  const recentAchievements = useMemo(() => {
    const allAchievements = filteredReviews.flatMap(
      (r) => r.achievements as Achievement[]
    );
    return allAchievements
      .sort(
        (a, b) =>
          new Date(b.date_achieved).getTime() -
          new Date(a.date_achieved).getTime()
      )
      .slice(0, 5);
  }, [filteredReviews]);

  // Get active goals
  const activeGoals = useMemo(() => {
    const allGoals = filteredReviews.flatMap((r) => r.goals as Goal[]);
    return allGoals.filter(
      (g) => g.status === "in_progress" || g.status === "not_started"
    );
  }, [filteredReviews]);

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

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case "improving":
      case "up":
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case "declining":
      case "down":
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      default:
        return <BarChart3 className="h-4 w-4 text-gray-500" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="h-6 w-6" />
            Performance Analytics
          </h2>
          <p className="text-muted-foreground">
            Performance insights and trends for {staffName}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {onExportReport && (
            <Button
              variant="outline"
              onClick={onExportReport}
              disabled={isLoading}
            >
              <Download className="h-4 w-4 mr-2" />
              Export Report
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="text-sm font-medium">Time Period</label>
              <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="6months">Last 6 Months</SelectItem>
                  <SelectItem value="1year">Last Year</SelectItem>
                  <SelectItem value="2years">Last 2 Years</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <label className="text-sm font-medium">Metric Focus</label>
              <Select value={selectedMetric} onValueChange={setSelectedMetric}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Metrics</SelectItem>
                  <SelectItem value="quality">Quality</SelectItem>
                  <SelectItem value="productivity">Productivity</SelectItem>
                  <SelectItem value="communication">Communication</SelectItem>
                  <SelectItem value="teamwork">Teamwork</SelectItem>
                  <SelectItem value="reliability">Reliability</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Performance Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Average Rating</p>
                <div className="flex items-center gap-2 mt-1">
                  {renderStarRating(performanceStats.averageRating)}
                </div>
              </div>
              {getTrendIcon(performanceStats.ratingTrend)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Total Reviews</p>
                <p className="text-2xl font-bold">
                  {performanceStats.totalReviews}
                </p>
              </div>
              <Calendar className="h-4 w-4 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Goal Completion</p>
                <p className="text-2xl font-bold">
                  {performanceStats.totalGoals > 0
                    ? Math.round(
                        (performanceStats.completedGoals /
                          performanceStats.totalGoals) *
                          100
                      )
                    : 0}
                  %
                </p>
                <p className="text-xs text-muted-foreground">
                  {performanceStats.completedGoals} of{" "}
                  {performanceStats.totalGoals}
                </p>
              </div>
              <Target className="h-4 w-4 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Achievements</p>
                <p className="text-2xl font-bold">
                  {performanceStats.achievements}
                </p>
              </div>
              <Award className="h-4 w-4 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Trend */}
      <Card>
        <CardHeader>
          <CardTitle>Performance Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-4">
            <Badge
              className={
                performanceStats.ratingTrend === "improving"
                  ? "bg-green-100 text-green-800"
                  : performanceStats.ratingTrend === "declining"
                  ? "bg-red-100 text-red-800"
                  : "bg-gray-100 text-gray-800"
              }
            >
              {getTrendIcon(performanceStats.ratingTrend)}
              <span className="ml-1">
                {performanceStats.ratingTrend.toUpperCase()}
              </span>
            </Badge>
            {performanceStats.lastReviewDate && (
              <span className="text-sm text-muted-foreground">
                Last reviewed:{" "}
                {new Date(performanceStats.lastReviewDate).toLocaleDateString()}
              </span>
            )}
          </div>

          {filteredReviews.length === 0 && (
            <p className="text-center text-muted-foreground py-8">
              No performance reviews found for the selected period.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Metric Analysis */}
      {metricAnalysis.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Metric Performance Analysis</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {metricAnalysis.map((metric) => (
              <div key={metric.name} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold">{metric.name}</h3>
                  <div className="flex items-center gap-2">
                    {getTrendIcon(metric.trend)}
                    <Badge
                      className={
                        metric.trend === "up"
                          ? "bg-green-100 text-green-800"
                          : metric.trend === "down"
                          ? "bg-red-100 text-red-800"
                          : "bg-gray-100 text-gray-800"
                      }
                    >
                      {metric.improvement > 0 ? "+" : ""}
                      {metric.improvement.toFixed(1)}
                    </Badge>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Current Score:</span>
                    <p className="text-muted-foreground">
                      {metric.currentScore} / {metric.maxScore}
                    </p>
                  </div>
                  <div>
                    <span className="font-medium">Previous Score:</span>
                    <p className="text-muted-foreground">
                      {metric.previousScore} / {metric.maxScore}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Active Goals & Recent Achievements */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Active Goals */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Active Goals ({activeGoals.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {activeGoals.slice(0, 5).map((goal) => (
              <div key={goal.id} className="border rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-sm">{goal.title}</h4>
                  <Badge variant="outline" className="text-xs">
                    {goal.status.replace("_", " ").toUpperCase()}
                  </Badge>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span>Progress</span>
                    <span>{goal.progress_percentage}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full"
                      style={{ width: `${goal.progress_percentage}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Due: {new Date(goal.target_date).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}

            {activeGoals.length === 0 && (
              <p className="text-center text-muted-foreground py-4">
                No active goals found.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Recent Achievements */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5" />
              Recent Achievements
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentAchievements.map((achievement) => (
              <div key={achievement.id} className="border rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-sm">{achievement.title}</h4>
                  <Badge variant="outline" className="text-xs">
                    {achievement.recognition_type
                      .replace("_", " ")
                      .toUpperCase()}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mb-2">
                  {achievement.description}
                </p>
                <p className="text-xs text-muted-foreground">
                  {new Date(achievement.date_achieved).toLocaleDateString()}
                </p>
              </div>
            ))}

            {recentAchievements.length === 0 && (
              <p className="text-center text-muted-foreground py-4">
                No achievements recorded.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
