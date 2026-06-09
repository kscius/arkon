import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Rol, Usuario } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersService } from './users.service';

@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly service: UsersService) {}

  @Get()
  @UseGuards(RolesGuard)
  @Roles(Rol.estatal, Rol.municipal)
  list(@CurrentUser() user: Usuario) {
    return this.service.findAll(user);
  }

  @Get(':id')
  get(@Param('id') id: string, @CurrentUser() user: Usuario) {
    return this.service.findOne(id, user);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(Rol.estatal)
  create(@Body() body: Record<string, string>, @CurrentUser() user: Usuario) {
    return this.service.create(body as Parameters<UsersService['create']>[0], user);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(Rol.estatal)
  update(@Param('id') id: string, @Body() body: UpdateUserDto, @CurrentUser() user: Usuario) {
    return this.service.update(id, body, user);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(Rol.estatal)
  remove(@Param('id') id: string, @CurrentUser() user: Usuario) {
    return this.service.remove(id, user);
  }
}
