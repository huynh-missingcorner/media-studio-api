import { Test, TestingModule } from '@nestjs/testing';
import { CreateProjectDto } from './dto/create-project.dto';
import { NotFoundException } from '@nestjs/common';
import { ProjectController } from './project.controller';
import { ProjectService } from './project.service';
import { UpdateProjectDto } from './dto/update-project.dto';

describe('ProjectController', () => {
  let controller: ProjectController;

  const mockProjectService = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    validateGoogleProjectId: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProjectController],
      providers: [
        {
          provide: ProjectService,
          useValue: mockProjectService,
        },
      ],
    }).compile();

    controller = module.get<ProjectController>(ProjectController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getAllProjects', () => {
    it('should return an array of projects', async () => {
      const mockProjects = [
        { id: '1', name: 'Project 1', description: 'Description 1' },
        { id: '2', name: 'Project 2', description: 'Description 2' },
      ];
      mockProjectService.findAll.mockResolvedValue(mockProjects);

      const result = await controller.getAllProjects();

      expect(result).toEqual(mockProjects);
      expect(mockProjectService.findAll).toHaveBeenCalledTimes(1);
    });
  });

  describe('getProjectById', () => {
    it('should return a project by id', async () => {
      const mockProject = { id: '1', name: 'Project 1', description: 'Description 1' };
      mockProjectService.findOne.mockResolvedValue(mockProject);

      const result = await controller.getProjectById('1');

      expect(result).toEqual(mockProject);
      expect(mockProjectService.findOne).toHaveBeenCalledWith('1');
    });

    it('should throw NotFoundException when project not found', async () => {
      mockProjectService.findOne.mockRejectedValue(new NotFoundException());

      await expect(controller.getProjectById('999')).rejects.toThrow(NotFoundException);
      expect(mockProjectService.findOne).toHaveBeenCalledWith('999');
    });
  });

  describe('createProject', () => {
    it('should create a new project', async () => {
      const createProjectDto: CreateProjectDto = {
        name: 'New Project',
        description: 'New Description',
        googleProjectId: 'google-123',
      };
      const mockCreatedProject = {
        id: '3',
        ...createProjectDto,
      };
      mockProjectService.create.mockResolvedValue(mockCreatedProject);

      const result = await controller.createProject(createProjectDto);

      expect(result).toEqual(mockCreatedProject);
      expect(mockProjectService.create).toHaveBeenCalledWith(createProjectDto);
    });
  });

  describe('updateProject', () => {
    it('should update a project', async () => {
      const updateProjectDto: UpdateProjectDto = {
        name: 'Updated Project',
        description: 'Updated Description',
      };
      const mockUpdatedProject = {
        id: '1',
        ...updateProjectDto,
      };
      mockProjectService.update.mockResolvedValue(mockUpdatedProject);

      const result = await controller.updateProject('1', updateProjectDto);

      expect(result).toEqual(mockUpdatedProject);
      expect(mockProjectService.update).toHaveBeenCalledWith('1', updateProjectDto);
    });

    it('should throw NotFoundException when project not found', async () => {
      const updateProjectDto: UpdateProjectDto = { name: 'Updated Project' };
      mockProjectService.update.mockRejectedValue(new NotFoundException());

      await expect(controller.updateProject('999', updateProjectDto)).rejects.toThrow(
        NotFoundException,
      );
      expect(mockProjectService.update).toHaveBeenCalledWith('999', updateProjectDto);
    });
  });

  describe('deleteProject', () => {
    it('should remove a project', async () => {
      mockProjectService.remove.mockResolvedValue(undefined);

      await controller.deleteProject('1');

      expect(mockProjectService.remove).toHaveBeenCalledWith('1');
    });

    it('should throw NotFoundException when project not found', async () => {
      mockProjectService.remove.mockRejectedValue(new NotFoundException());

      await expect(controller.deleteProject('999')).rejects.toThrow(NotFoundException);
      expect(mockProjectService.remove).toHaveBeenCalledWith('999');
    });
  });
});
