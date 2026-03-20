import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Comment, CommentDocument } from './schemas/comment.schema';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { Post, PostDocument } from '../posts/schemas/post.schema';

@Injectable()
export class CommentsService {
  constructor(
    @InjectModel(Comment.name) private commentModel: Model<CommentDocument>,
    @InjectModel(Post.name) private postModel: Model<PostDocument>,
  ) {}

  async create(createCommentDto: CreateCommentDto): Promise<Comment> {
    const post = await this.postModel
      .findOne({ _id: createCommentDto.postId, isPublished: true })
      .exec();

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    // Ownership rule: a post owner cannot comment on their own post.
    if (post.authorId === createCommentDto.authorId) {
      throw new ForbiddenException('You cannot comment on your own post');
    }

    const comment = new this.commentModel(createCommentDto);
    const saved = await comment.save();

    // Keep post metadata in sync for downstream features.
    await this.postModel
      .findByIdAndUpdate(createCommentDto.postId, { $inc: { commentCount: 1 } })
      .exec();

    return saved;
  }

  async findAll(): Promise<Comment[]> {
    return this.commentModel.find({ isDeleted: false }).sort({ createdAt: -1 }).exec();
  }

  async findOne(id: string): Promise<Comment | null> {
    return this.commentModel.findOne({ _id: id, isDeleted: false }).exec();
  }

  async findByPost(postId: string): Promise<Comment[]> {
    return this.commentModel
      .find({ postId, isDeleted: false })
      .sort({ createdAt: -1 })
      .exec();
  }

  async findByAuthor(authorId: string): Promise<Comment[]> {
    return this.commentModel
      .find({ authorId, isDeleted: false })
      .sort({ createdAt: -1 })
      .exec();
  }

  async update(id: string, updateCommentDto: UpdateCommentDto): Promise<Comment | null> {
    return this.commentModel
      .findOneAndUpdate({ _id: id, isDeleted: false }, updateCommentDto, { new: true })
      .exec();
  }

  async remove(id: string): Promise<Comment | null> {
    return this.commentModel
      .findOneAndUpdate({ _id: id, isDeleted: false }, { isDeleted: true }, { new: true })
      .exec();
  }
}
