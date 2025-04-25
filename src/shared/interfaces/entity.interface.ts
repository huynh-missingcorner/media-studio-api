export interface IEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ITimestampedEntity {
  createdAt: Date;
  updatedAt: Date;
}

export interface IUserOwnedEntity extends IEntity {
  userId: string;
}

export interface IAuditableEntity extends IEntity {
  createdById: string;
  updatedById: string | null;
}

export interface ISoftDeleteEntity extends IEntity {
  deletedAt: Date | null;
  isDeleted: boolean;
}
