import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../shared/infrastructure/prisma/prisma.service';
import { GoogleCloudService } from '../../shared/infrastructure/google-cloud/google-cloud.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';

@Injectable()
export class ProjectService {
  private readonly logger = new Logger(ProjectService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly googleCloudService: GoogleCloudService,
  ) {}

  /**
   * Find all projects
   * @returns Array of all projects
   */
  async findAll() {
    this.logger.log('Finding all projects');
    return this.prisma.project.findMany();
  }

  /**
   * Find a single project by id
   * @param id Project id
   * @returns The project if found
   * @throws NotFoundException if project not found
   */
  async findOne(id: string) {
    this.logger.log(`Finding project with id ${id}`);
    const project = await this.prisma.project.findUnique({
      where: { id },
    });

    if (!project) {
      this.logger.warn(`Project with id ${id} not found`);
      throw new NotFoundException(`Project with ID ${id} not found`);
    }

    return project;
  }

  /**
   * Create a new project
   * @param createProjectDto Project creation data
   * @returns The created project
   */
  async create(createProjectDto: CreateProjectDto) {
    this.logger.log('Creating new project');
    return this.prisma.project.create({
      data: createProjectDto,
    });
  }

  /**
   * Update a project by id
   * @param id Project id
   * @param updateProjectDto Project update data
   * @returns The updated project
   * @throws NotFoundException if project not found
   */
  async update(id: string, updateProjectDto: UpdateProjectDto) {
    this.logger.log(`Updating project with id ${id}`);

    // Check if project exists
    await this.findOne(id);

    return this.prisma.project.update({
      where: { id },
      data: updateProjectDto,
    });
  }

  /**
   * Delete a project by id
   * @param id Project id
   * @returns The deleted project
   * @throws NotFoundException if project not found
   */
  async remove(id: string) {
    this.logger.log(`Removing project with id ${id}`);

    // Check if project exists
    await this.findOne(id);

    return this.prisma.project.delete({
      where: { id },
    });
  }
}
