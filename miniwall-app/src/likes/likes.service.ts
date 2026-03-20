import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Like, LikeDocument } from './schemas/like.schema';
import { CreateLikeDto } from './dto/create-like.dto';
import { Post, PostDocument } from '../posts/schemas/post.schema';

@Injectable()
export class LikesService {
  constructor(
    @InjectModel(Like.name) private likeModel: Model<LikeDocument>,
    @InjectModel(Post.name) private postModel: Model<PostDocument>,
  ) {}

  async create(createLikeDto: CreateLikeDto): Promise<Like> {
    const post = await this.postModel
      .findOne({ _id: createLikeDto.postId, isPublished: true })
      .exec();

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    // Ownership rule: a post owner cannot like their own post.
    if (post.authorId === createLikeDto.userId) {
      throw new ForbiddenException('You cannot like your own post');
    }

    // Avoid duplicates at the application level (schema also has a unique index).
    const existing = await this.likeModel
      .findOne({ postId: createLikeDto.postId, userId: createLikeDto.userId })
      .exec();
    if (existing) {
      throw new ConflictException('Like already exists');
    }

    const like = new this.likeModel(createLikeDto);
    const saved = await like.save();

    // Keep post metadata in sync for popular-post ordering.
    await this.postModel
      .findByIdAndUpdate(createLikeDto.postId, { $inc: { likeCount: 1 } })
      .exec();

    return saved;
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
