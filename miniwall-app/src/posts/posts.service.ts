import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Post, PostDocument } from './schemas/post.schema';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';

@Injectable()
export class PostsService {
  constructor(@InjectModel(Post.name) private postModel: Model<PostDocument>) {}

  async create(createPostDto: CreatePostDto): Promise<Post> {
    const post = new this.postModel(createPostDto);
    return post.save();
  }

  async findAll(): Promise<Post[]> {
    return this.postModel
      .find({ isPublished: true })
      .sort({ createdAt: -1 })
      .exec();
  }

  async findOne(id: string): Promise<Post | null> {
    return this.postModel.findOne({ _id: id, isPublished: true }).exec();
  }

  async findByAuthor(authorId: string): Promise<Post[]> {
    return this.postModel
      .find({ authorId, isPublished: true })
      .sort({ createdAt: -1 })
      .exec();
  }

  async update(id: string, updatePostDto: UpdatePostDto): Promise<Post | null> {
    return this.postModel
      .findOneAndUpdate({ _id: id, isPublished: true }, updatePostDto, { new: true })
      .exec();
  }

  async remove(id: string): Promise<Post | null> {
    return this.postModel.findByIdAndDelete(id).exec();
  }

  async softDelete(id: string): Promise<Post | null> {
    return this.postModel
      .findOneAndUpdate({ _id: id }, { isPublished: false }, { new: true })
      .exec();
  }

  async incrementLikeCount(postId: string): Promise<Post | null> {
    return this.postModel
      .findOneAndUpdate({ _id: postId }, { $inc: { likeCount: 1 } }, { new: true })
      .exec();
  }

  async incrementCommentCount(postId: string): Promise<Post | null> {
    return this.postModel
      .findByIdAndUpdate(postId, { $inc: { commentCount: 1 } }, { new: true })
      .exec();
  }

  async decrementCommentCount(postId: string): Promise<Post | null> {
    return this.postModel
      .findByIdAndUpdate(postId, { $inc: { commentCount: -1 } }, { new: true })
      .exec();
  }
}
