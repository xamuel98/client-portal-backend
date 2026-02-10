import { Model, Document, UpdateQuery, Query, Types } from 'mongoose';

export interface QueryOptions {
  select?: string | string[];
  sort?: any;
  limit?: number;
  skip?: number;
  populate?: string | string[];
}

export interface IRepository<T> {
  create(data: Partial<T>): Promise<T>;
  findById(id: string): Promise<T | null>;
  findOne(filter: any): Promise<T | null>;
  find(filter: any, options?: QueryOptions): Promise<T[]>;
  findByTenant(
    tenantId: string,
    filter: any,
    options?: QueryOptions,
  ): Promise<T[]>;
  update(id: string, data: Partial<T>): Promise<T | null>;
  delete(id: string): Promise<boolean>;
  softDelete(id: string): Promise<boolean>;
  count(filter: any): Promise<number>;
  exists(filter: any): Promise<boolean>;
}

export abstract class BaseRepository<
  T extends Document,
> implements IRepository<T> {
  constructor(protected readonly model: Model<T>) {}

  async create(data: Partial<T>): Promise<T> {
    const entity = new this.model(data);
    return entity.save();
  }

  async findById(id: string): Promise<T | null> {
    return this.model.findById(id).exec();
  }

  async findOne(filter: any): Promise<T | null> {
    return this.model.findOne(filter).exec();
  }

  async findOneByTenant(tenantId: string, filter: any): Promise<T | null> {
    const tenantObjectId = Types.ObjectId.isValid(tenantId)
      ? new Types.ObjectId(tenantId)
      : tenantId;
    return this.model
      .findOne({
        ...filter,
        tenantId: tenantObjectId,
        deletedAt: { $exists: false },
      })
      .exec();
  }

  async find(filter: any, options?: QueryOptions): Promise<T[]> {
    let query: Query<T[], T> = this.model.find(filter);

    if (options?.select) {
      query = query.select(options.select);
    }

    if (options?.sort) {
      query = query.sort(options.sort);
    }

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    if (options?.skip) {
      query = query.skip(options.skip);
    }

    if (options?.populate) {
      const populateFields = Array.isArray(options.populate)
        ? options.populate
        : [options.populate];
      populateFields.forEach(
        (field: string) => (query = query.populate(field) as any),
      );
    }

    return query.exec();
  }

  async findByTenant(
    tenantId: string,
    filter: any,
    options?: QueryOptions,
  ): Promise<T[]> {
    const tenantObjectId = Types.ObjectId.isValid(tenantId)
      ? new Types.ObjectId(tenantId)
      : tenantId;
    return this.find({ ...filter, tenantId: tenantObjectId }, options);
  }

  async findPaginatedByTenant(
    tenantId: string,
    filter: any,
    page: number = 1,
    limit: number = 10,
    options?: Omit<QueryOptions, 'limit' | 'skip'>,
  ): Promise<{ data: T[]; total: number }> {
    const skip = (page - 1) * limit;
    const tenantObjectId = Types.ObjectId.isValid(tenantId)
      ? new Types.ObjectId(tenantId)
      : tenantId;
    const finalFilter = { ...filter, tenantId: tenantObjectId };

    const [data, total] = await Promise.all([
      this.find(finalFilter, { ...options, limit, skip }),
      this.count(finalFilter),
    ]);

    return { data, total };
  }

  async update(id: string, data: UpdateQuery<T>): Promise<T | null> {
    return this.model
      .findByIdAndUpdate(id, { $set: data }, { new: true, runValidators: true })
      .exec();
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.model.findByIdAndDelete(id).exec();
    return result !== null;
  }

  async softDelete(id: string): Promise<boolean> {
    const result = await this.model
      .findByIdAndUpdate(id, { $set: { deletedAt: new Date() } } as any, {
        new: true,
      })
      .exec();
    return result !== null;
  }

  async count(filter: any): Promise<number> {
    return this.model.countDocuments(filter).exec();
  }

  async exists(filter: any): Promise<boolean> {
    const count = await this.model.countDocuments(filter).limit(1).exec();
    return count > 0;
  }

  async upsert(filter: any, data: UpdateQuery<T>): Promise<T> {
    return this.model
      .findOneAndUpdate(
        filter,
        { $set: data },
        { new: true, upsert: true, runValidators: true },
      )
      .exec() as any;
  }
}
