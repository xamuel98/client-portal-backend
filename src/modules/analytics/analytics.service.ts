import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Project } from '../projects/schemas/project.schema';
import { Task } from '../tasks/schemas/task.schema';
import { Invoice } from '../invoices/schemas/invoice.schema';
import { User } from '../users/schemas/user.schema';
import { Message } from '../messages/schemas/message.schema';
import {
  DateRangeDto,
  RevenueAnalyticsQueryDto,
  ProjectAnalyticsQueryDto,
  RevenuePeriod,
} from './dto/analytics.dto';

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectModel(Project.name) private projectModel: Model<Project>,
    @InjectModel(Task.name) private taskModel: Model<Task>,
    @InjectModel(Invoice.name) private invoiceModel: Model<Invoice>,
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(Message.name) private messageModel: Model<Message>,
  ) {}

  async getDashboardMetrics(tenantId: string) {
    const tenantObjectId = new Types.ObjectId(tenantId);

    const [
      projectStats,
      taskStats,
      invoiceStats,
      totalRevenue,
      outstandingRevenue,
      unreadMessages,
    ] = await Promise.all([
      // Projects combined stats
      this.projectModel.aggregate([
        { $match: { tenantId: tenantObjectId } },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            active: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } },
            completed: {
              $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] },
            },
          },
        },
      ]),

      // Tasks combined stats
      this.taskModel.aggregate([
        { $match: { tenantId: tenantObjectId } },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            completed: {
              $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] },
            },
          },
        },
      ]),

      // Invoices combined stats
      this.invoiceModel.aggregate([
        { $match: { tenantId: tenantObjectId } },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            paid: { $sum: { $cond: [{ $eq: ['$status', 'paid'] }, 1, 0] } },
          },
        },
      ]),

      // Revenue (already optimized)
      this.invoiceModel.aggregate([
        { $match: { tenantId: tenantObjectId, status: 'paid' } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      this.invoiceModel.aggregate([
        {
          $match: {
            tenantId: tenantObjectId,
            status: { $in: ['pending', 'sent'] },
          },
        },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),

      // Messages
      this.messageModel.countDocuments({
        tenantId: tenantObjectId,
        read: false,
      }),
    ]);

    const projects = projectStats[0] || { total: 0, active: 0, completed: 0 };
    const tasks = taskStats[0] || { total: 0, completed: 0 };
    const invoices = invoiceStats[0] || { total: 0, paid: 0 };

    return {
      projects: {
        total: projects.total,
        active: projects.active,
        completed: projects.completed,
        completionRate:
          projects.total > 0
            ? ((projects.completed / projects.total) * 100).toFixed(2)
            : 0,
      },
      tasks: {
        total: tasks.total,
        completed: tasks.completed,
        pending: tasks.total - tasks.completed,
        completionRate:
          tasks.total > 0
            ? ((tasks.completed / tasks.total) * 100).toFixed(2)
            : 0,
      },
      invoices: {
        total: invoices.total,
        paid: invoices.paid,
        pending: invoices.total - invoices.paid,
      },
      revenue: {
        total: totalRevenue[0]?.total || 0,
        outstanding: outstandingRevenue[0]?.total || 0,
      },
      messages: {
        unread: unreadMessages,
      },
    };
  }

  async getProjectAnalytics(tenantId: string, query: ProjectAnalyticsQueryDto) {
    const tenantObjectId = new Types.ObjectId(tenantId);
    const matchStage: any = { tenantId: tenantObjectId };

    if (query.status) {
      matchStage.status = query.status;
    }

    if (query.startDate || query.endDate) {
      matchStage.createdAt = {};
      if (query.startDate) {
        matchStage.createdAt.$gte = new Date(query.startDate);
      }
      if (query.endDate) {
        matchStage.createdAt.$lte = new Date(query.endDate);
      }
    }

    const [statusDistribution, avgDuration, tasksPerProject] =
      await Promise.all([
        // Status distribution
        this.projectModel.aggregate([
          { $match: matchStage },
          { $group: { _id: '$status', count: { $sum: 1 } } },
        ]),

        // Average project duration (for completed projects)
        this.projectModel.aggregate([
          {
            $match: {
              ...matchStage,
              status: 'completed',
              completedAt: { $exists: true },
            },
          },
          {
            $project: {
              duration: {
                $divide: [
                  { $subtract: ['$completedAt', '$createdAt'] },
                  1000 * 60 * 60 * 24, // Convert to days
                ],
              },
            },
          },
          { $group: { _id: null, avgDuration: { $avg: '$duration' } } },
        ]),

        // Tasks per project
        this.taskModel.aggregate([
          { $match: { tenantId: tenantObjectId } },
          { $group: { _id: '$projectId', taskCount: { $sum: 1 } } },
          { $group: { _id: null, avgTasks: { $avg: '$taskCount' } } },
        ]),
      ]);

    return {
      statusDistribution,
      averageDuration: avgDuration[0]?.avgDuration || 0,
      averageTasksPerProject: tasksPerProject[0]?.avgTasks || 0,
    };
  }

  async getProjectById(projectId: string, tenantId: string) {
    const projectObjectId = new Types.ObjectId(projectId);
    const tenantObjectId = new Types.ObjectId(tenantId);

    const [project, taskStats, revenueStats] = await Promise.all([
      this.projectModel.findOne({
        _id: projectObjectId,
        tenantId: tenantObjectId,
      }),

      // Task statistics
      this.taskModel.aggregate([
        {
          $match: {
            projectId: projectObjectId,
            tenantId: tenantObjectId,
          },
        },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
          },
        },
      ]),

      // Revenue statistics
      this.invoiceModel.aggregate([
        {
          $match: {
            projectId: projectObjectId,
            tenantId: tenantObjectId,
          },
        },
        {
          $group: {
            _id: '$status',
            total: { $sum: '$amount' },
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    if (!project) {
      throw new Error('Project not found');
    }

    return {
      project,
      tasks: taskStats,
      revenue: revenueStats,
    };
  }

  async getUserActivityAnalytics(tenantId: string, query: DateRangeDto) {
    const tenantObjectId = new Types.ObjectId(tenantId);
    const matchStage: any = { tenantId: tenantObjectId };

    if (query.startDate || query.endDate) {
      matchStage.createdAt = {};
      if (query.startDate) {
        matchStage.createdAt.$gte = new Date(query.startDate);
      }
      if (query.endDate) {
        matchStage.createdAt.$lte = new Date(query.endDate);
      }
    }

    const [mostActiveTasks, mostActiveMessages] = await Promise.all([
      // Most active users by tasks completed
      this.taskModel.aggregate([
        { $match: { ...matchStage, status: 'completed' } },
        { $group: { _id: '$assignedTo', tasksCompleted: { $sum: 1 } } },
        { $sort: { tasksCompleted: -1 } },
        { $limit: 10 },
        {
          $lookup: {
            from: 'users',
            localField: '_id',
            foreignField: '_id',
            as: 'user',
          },
        },
        { $unwind: '$user' },
        {
          $project: {
            userId: '$_id',
            tasksCompleted: 1,
            userName: {
              $concat: [
                '$user.profile.firstName',
                ' ',
                '$user.profile.lastName',
              ],
            },
            email: '$user.email',
          },
        },
      ]),

      // Most active users by messages sent
      this.messageModel.aggregate([
        { $match: matchStage },
        { $group: { _id: '$senderId', messagesSent: { $sum: 1 } } },
        { $sort: { messagesSent: -1 } },
        { $limit: 10 },
        {
          $lookup: {
            from: 'users',
            localField: '_id',
            foreignField: '_id',
            as: 'user',
          },
        },
        { $unwind: '$user' },
        {
          $project: {
            userId: '$_id',
            messagesSent: 1,
            userName: {
              $concat: [
                '$user.profile.firstName',
                ' ',
                '$user.profile.lastName',
              ],
            },
            email: '$user.email',
          },
        },
      ]),
    ]);

    return {
      mostActiveByTasks: mostActiveTasks,
      mostActiveByMessages: mostActiveMessages,
    };
  }

  async getRevenueAnalytics(tenantId: string, query: RevenueAnalyticsQueryDto) {
    const tenantObjectId = new Types.ObjectId(tenantId);
    const matchStage: any = { tenantId: tenantObjectId };

    if (query.startDate || query.endDate) {
      matchStage.createdAt = {};
      if (query.startDate) {
        matchStage.createdAt.$gte = new Date(query.startDate);
      }
      if (query.endDate) {
        matchStage.createdAt.$lte = new Date(query.endDate);
      }
    }

    const [revenueStats, revenueByProject, revenueTrends] = await Promise.all([
      // Combined Revenue & Status stats
      this.invoiceModel.aggregate([
        { $match: matchStage },
        {
          $facet: {
            overall: [
              {
                $group: {
                  _id: null,
                  total: { $sum: '$amount' },
                  count: { $sum: 1 },
                },
              },
            ],
            byStatus: [
              {
                $group: {
                  _id: '$status',
                  total: { $sum: '$amount' },
                  count: { $sum: 1 },
                },
              },
            ],
          },
        },
      ]),

      // Revenue by project
      this.invoiceModel.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: '$projectId',
            total: { $sum: '$amount' },
            count: { $sum: 1 },
          },
        },
        { $sort: { total: -1 } },
        { $limit: 10 },
        {
          $lookup: {
            from: 'projects',
            localField: '_id',
            foreignField: '_id',
            as: 'project',
          },
        },
        { $unwind: { path: '$project', preserveNullAndEmptyArrays: true } },
        {
          $project: {
            projectId: '$_id',
            projectName: '$project.name',
            total: 1,
            count: 1,
          },
        },
      ]),

      // Revenue trends over time
      this.getRevenueTrends(
        tenantObjectId,
        query.period || RevenuePeriod.MONTHLY,
        matchStage,
      ),
    ]);

    const stats = revenueStats[0] || { overall: [], byStatus: [] };
    const overall = stats.overall[0] || { total: 0, count: 0 };

    return {
      total: overall.total,
      invoiceCount: overall.count,
      byStatus: stats.byStatus,
      byProject: revenueByProject,
      trends: revenueTrends,
    };
  }

  private async getRevenueTrends(
    tenantId: Types.ObjectId,
    period: RevenuePeriod,
    matchStage: any,
  ) {
    let groupBy: any;

    switch (period) {
      case RevenuePeriod.MONTHLY:
        groupBy = {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
        };
        break;
      case RevenuePeriod.QUARTERLY:
        groupBy = {
          year: { $year: '$createdAt' },
          quarter: { $ceil: { $divide: [{ $month: '$createdAt' }, 3] } },
        };
        break;
      case RevenuePeriod.YEARLY:
        groupBy = {
          year: { $year: '$createdAt' },
        };
        break;
    }

    return this.invoiceModel.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: groupBy,
          total: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.quarter': 1 } },
    ]);
  }
}
