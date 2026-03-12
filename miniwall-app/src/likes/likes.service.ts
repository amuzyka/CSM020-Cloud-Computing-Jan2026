import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Like, LikeDocument } from './schemas/like.schema';
import { CreateLikeDto } from './dto/create-like.dto';

@Injectable()
export class LikesService {
  constructor(@InjectModel(Like.name) private likeModel: Model<LikeDocument>) {}

  async create(createLikeDto: CreateLikeDto): Promise<Like> {
    const like = new this.likeModel(createLikeDto);
    return like.save();
  }

  async findAll(): Promise<Like[]> {
    return this.likeModel.find().exec();
  }

  async findOne(id: string): Promise<Like | null> {
    return this.likeModel.findOne({ _id: id }).exec();
  }

  async findByPost(postId: string): Promise<Like[]> {
    return this.likeModel.find({ postId }).exec();
  }

  async findByUser(userId: string): Promise<Like[]> {
    return this.likeModel.find({ userId }).exec();
  }

  async findByPostAndUser(postId: string, userId: string): Promise<Like | null> {
    return this.likeModel.findOne({ postId, userId }).exec();
  }

  async remove(postId: string, userId: string): Promise<Like | null> {
    return this.likeModel.findOneAndDelete({ postId, userId }).exec();
  }

  async removeById(id: string): Promise<Like | null> {
    return this.likeModel.findByIdAndDelete(id).exec();
  }
}
