import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from './schemas/user.schema';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name)
    private userModel: Model<UserDocument>,
    private jwtService: JwtService,
  ) {}

  async validateUser(username: string, password: string): Promise<any> {
    const user = await this.userModel.findOne({ 
      $or: [{ email: username }, { username: username }] 
    });
    
    if (user && await bcrypt.compare(password, user.password)) {
      const { password, ...result } = user.toObject();
      return result;
    }
    return null;
  }

  async login(user: any) {
    const payload = { username: user.username, sub: user._id, roles: user.roles };
    return {
      access_token: this.jwtService.sign(payload),
      refresh_token: this.jwtService.sign(payload, { expiresIn: '7d' }),
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        roles: user.roles,
      },
    };
  }

  async register(userData: {
    username: string;
    email: string;
    password: string;
  }): Promise<any> {
    const existingUser = await this.userModel.findOne({
      $or: [{ email: userData.email }, { username: userData.username }]
    });

    if (existingUser) {
      throw new UnauthorizedException('User already exists');
    }

    const user = new this.userModel(userData);
    await user.save();

    const { password, ...result } = user.toObject();
    return result;
  }

  async refreshToken(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken);
      const user = await this.userModel.findById(payload.sub);
      
      if (!user) {
        throw new UnauthorizedException('Invalid token');
      }

      return this.login(user.toObject());
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }
}
