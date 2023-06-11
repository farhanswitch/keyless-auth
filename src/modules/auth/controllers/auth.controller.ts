import {
  Controller,
  Body,
  Post,
  HttpCode,
  HttpStatus,
  Get,
  Param,
  Query,
  Res,
  Req,
} from '@nestjs/common';
import { AuthService } from '../services/auth.service';
import { LoginDto } from '../dto/login.dto';
import type { Request, Response } from 'express';

@Controller('auth')
export class AuthController {
  constructor(private readonly service: AuthService) {}
  @HttpCode(HttpStatus.OK)
  @Post('/login')
  async loginCtrl(
    @Body() param: LoginDto,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    // console.log({ cookies: req.cookies });

    const data = await this.service.loginService(param);

    res.cookie('XFRE', data.refresh_token, {
      maxAge: data.refresh_expires_in * 1000,
      httpOnly: true,
      sameSite: 'none',
      secure: true,
    });

    res.cookie('XACS', data.access_token, {
      maxAge: data.expires_in * 1000,
      httpOnly: true,
      sameSite: 'none',
      secure: true,
    });

    res.send(data);
  }

  @Get('/validate-access')
  async validateAccessCtrl(
    @Query('uri') path: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const { XACS } = req.cookies;

    if (!XACS) {
      res.json({
        statusCode: HttpStatus.UNAUTHORIZED,
        details: {
          message: 'Login first!',
        },
      });
      return;
    }
    const data = await this.service.validateAccess(XACS, path);
    res.json({
      statusCode: HttpStatus.OK,
      details: {
        data,
      },
    });
  }
  @Get('/refresh')
  async refershCtrl(@Req() req: Request, @Res() res: Response) {
    try {
      const { XFRE } = req.cookies;
      console.log({ XFRE });

      if (!XFRE) {
        res.json({
          statusCode: HttpStatus.UNAUTHORIZED,
          details: {
            message: 'Login first!',
          },
        });
        return;
      }
      const data = await this.service.refreshAccess(XFRE);
      res.cookie('XFRE', data.refresh_token, {
        maxAge: data.refresh_expires_in * 1000,
        httpOnly: true,
        sameSite: 'none',
        secure: true,
      });

      res.cookie('XACS', data.access_token, {
        maxAge: data.expires_in * 1000,
        httpOnly: true,
        sameSite: 'none',
        secure: true,
      });
      res.json(data);
    } catch (error) {
      res.json({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        details: {
          error,
        },
      });
    }
  }
  @Get('/resource')
  async getResource(@Query('uri') path: string) {
    return await this.service.getResourceTypeFromURL(path);
  }
  @Get('/encrypt/:str')
  encryptData(@Param('str') param: string) {
    return this.service.encryptData(param);
  }

  @Get('/decrypt/')
  decryptCtrl(@Query('str') param: string) {
    return this.service.decryptData(param);
  }
}
