import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Comment, CommentDocument } from './schemas/comment.schema';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';

@Injectable()
export class CommentsService {
  constructor(@InjectModel(Comment.name) private commentModel: Model<CommentDocument>) {}

  async create(createCommentDto: CreateCommentDto): Promise<Comment> {
    const comment = new this.commentModel(createCommentDto);
    return comment.save();
  }

  async findAll(): Promise<Comment[]> {
    return this.commentModel.find({ isDeleted: false }).sort({ createdAt: -1 }).exec();
  }

  async findOne(id: string): Promise<Comment> {
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

  async update(id: string, updateCommentDto: UpdateCommentDto): Promise<Comment> {
    return this.commentModel
      .findByIdAndUpdate(id, updateCommentDto, { new: true })
      .exec();
  }

  async remove(id: string): Promise<Comment> {
    return this.commentModel
      .findByIdAndUpdate(id, { isDeleted: true }, { new: true })
      .exec();
  }
}
