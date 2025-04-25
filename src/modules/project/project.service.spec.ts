import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../shared/infrastructure/prisma/prisma.service';
import { GoogleCloudService } from '../../shared/infrastructure/google-cloud/google-cloud.service';
import { NotFoundException } from '@nestjs/common';
import { CreateProjectDto } from './dto/create-project.dto';
import { ProjectService } from './project.service';
import { UpdateProjectDto } from './dto/update-project.dto';

describe('ProjectService', () => {
  let service: ProjectService;

  const mockPrismaService = {
    project: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  const mockGoogleCloudService = {
    getAccessToken: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: GoogleCloudService, useValue: mockGoogleCloudService },
      ],
    }).compile();

    service = module.get<ProjectService>(ProjectService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return an array of projects', async () => {
      const mockProjects = [
        { id: '1', name: 'Project 1', description: 'Description 1', googleProjectId: 'google-1' },
        { id: '2', name: 'Project 2', description: 'Description 2', googleProjectId: 'google-2' },
      ];
      mockPrismaService.project.findMany.mockResolvedValue(mockProjects);

      const result = await service.findAll();

      expect(result).toEqual(mockProjects);
      expect(mockPrismaService.project.findMany).toHaveBeenCalledTimes(1);
    });
  });

  describe('findOne', () => {
    it('should return a project if it exists', async () => {
      const mockProject = {
        id: '1',
        name: 'Project 1',
        description: 'Description 1',
        googleProjectId: 'google-1',
      };
      mockPrismaService.project.findUnique.mockResolvedValue(mockProject);

      const result = await service.findOne('1');

      expect(result).toEqual(mockProject);
      expect(mockPrismaService.project.findUnique).toHaveBeenCalledWith({
        where: { id: '1' },
      });
    });

    it('should throw NotFoundException if project does not exist', async () => {
      mockPrismaService.project.findUnique.mockResolvedValue(null);

      await expect(service.findOne('1')).rejects.toThrow(NotFoundException);
      expect(mockPrismaService.project.findUnique).toHaveBeenCalledWith({
        where: { id: '1' },
      });
    });
  });

  describe('create', () => {
    it('should create and return a new project', async () => {
      const createProjectDto: CreateProjectDto = {
        name: 'New Project',
        description: 'New Description',
        googleProjectId: 'google-new',
      };
      const mockCreatedProject = {
        id: '3',
        ...createProjectDto,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockPrismaService.project.create.mockResolvedValue(mockCreatedProject);

      const result = await service.create(createProjectDto);

      expect(result).toEqual(mockCreatedProject);
      expect(mockPrismaService.project.create).toHaveBeenCalledWith({
        data: createProjectDto,
      });
    });
  });

  describe('update', () => {
    it('should update and return the project', async () => {
      const updateProjectDto: UpdateProjectDto = {
        name: 'Updated Project',
        description: 'Updated Description',
      };
      const mockUpdatedProject = {
        id: '1',
        name: 'Updated Project',
        description: 'Updated Description',
        googleProjectId: 'google-1',
        updatedAt: new Date(),
      };
      mockPrismaService.project.findUnique.mockResolvedValue({ id: '1' });
      mockPrismaService.project.update.mockResolvedValue(mockUpdatedProject);

      const result = await service.update('1', updateProjectDto);

      expect(result).toEqual(mockUpdatedProject);
      expect(mockPrismaService.project.findUnique).toHaveBeenCalledWith({
        where: { id: '1' },
      });
      expect(mockPrismaService.project.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: updateProjectDto,
      });
    });

    it('should throw NotFoundException if project does not exist', async () => {
      const updateProjectDto: UpdateProjectDto = {
        name: 'Updated Project',
      };
      mockPrismaService.project.findUnique.mockResolvedValue(null);

      await expect(service.update('1', updateProjectDto)).rejects.toThrow(NotFoundException);
      expect(mockPrismaService.project.findUnique).toHaveBeenCalledWith({
        where: { id: '1' },
      });
      expect(mockPrismaService.project.update).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('should delete and return the project', async () => {
      const mockDeletedProject = {
        id: '1',
        name: 'Project 1',
        description: 'Description 1',
        googleProjectId: 'google-1',
      };
      mockPrismaService.project.findUnique.mockResolvedValue(mockDeletedProject);
      mockPrismaService.project.delete.mockResolvedValue(mockDeletedProject);

      const result = await service.remove('1');

      expect(result).toEqual(mockDeletedProject);
      expect(mockPrismaService.project.findUnique).toHaveBeenCalledWith({
        where: { id: '1' },
      });
      expect(mockPrismaService.project.delete).toHaveBeenCalledWith({
        where: { id: '1' },
      });
    });

    it('should throw NotFoundException if project does not exist', async () => {
      mockPrismaService.project.findUnique.mockResolvedValue(null);

      await expect(service.remove('1')).rejects.toThrow(NotFoundException);
      expect(mockPrismaService.project.findUnique).toHaveBeenCalledWith({
        where: { id: '1' },
      });
      expect(mockPrismaService.project.delete).not.toHaveBeenCalled();
    });
  });
});
