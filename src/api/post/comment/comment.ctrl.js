import mongoose from 'mongoose';
import Post from '../../../models/post';
import Comment from '../../../models/comment';

import sanitizeHtml from 'sanitize-html';

const { ObjectId } = mongoose.Types;

/**
 * 댓글 등록
 * POST /api/post/:postId/comment/write
 */
export const cmWrite = async (ctx) => {
  const curPost = ctx.state.post;
  const { text } = ctx.request.body;
  const comment = new Comment({
    postId: curPost._id,
    likes: 0,
    text,
    user: ctx.state.user,
  });

  // 해당 포스트 댓글 배열에 추가
  try {
    const result = await Post.findByIdAndUpdate(
      curPost._id,
      {
        $push: { comments: comment },
      },
      {
        new: true, // 이 값을 설정하면 업데이트된 데이터를 반환합니다.
        // false 일 때에는 업데이트 되기 전의 데이터를 반환합니다.
      },
    ).exec();

    ctx.body = result;
  } catch (e) {
    ctx.throw(500, e);
  }
};

/**
 * 댓글 등록
 * POST /api/post/:postId/comment/update/:commentId
 */
export const cmUpdate = async (ctx) => {
  const { text } = ctx.request.body;
  const { commentId } = ctx.params;

  // 해당 포스트 댓글 배열에 추가
  try {
    const result = await Post.findOneAndUpdate(
      {
        'comments._id': commentId,
      },
      {
        $set: { 'comments.$.text': text },
      },
      {
        new: true, // 이 값을 설정하면 업데이트된 데이터를 반환합니다.
        // false 일 때에는 업데이트 되기 전의 데이터를 반환합니다.
      },
    ).exec();

    ctx.body = result;
  } catch (e) {
    ctx.throw(500, e);
  }
};

/**
 * 댓글 삭제
 * DELETE /api/post/:postId/comment/delete/:commentId
 */
export const cmDelete = async (ctx) => {
  const curPost = ctx.state.post;
  const { commentId } = ctx.params;

  // 1. post에서 해당 댓글 id 제거
  try {
    const post = await Post.findByIdAndUpdate(
      curPost._id,
      {
        $pull: { comments: { _id: commentId } },
      },
      {
        // 이 값을 설정하면 업데이트된 데이터를 반환합니다.
        // false 일 때에는 업데이트 되기 전의 데이터를 반환합니다.
        new: true,
      },
    ).exec();
    if (!post) {
      ctx.status = 404;
      return;
    } else {
      ctx.status = 204; // No Content (성공하기는 했지만 응답할 데이터는 없음)
    }
  } catch (e) {
    ctx.throw(500, e);
  }
};

/**
 * 댓글 좋아요
 * POST /api/post/:postId/comment/like/:commentId
 */
export const cmLike = async (ctx) => {
  const { postId, commentId } = ctx.params;
  const user = ctx.state.user;

  // 해당 post에 좋아요를 눌렀던 사람인지 확인
  let ExistUser;
  try {
    [ExistUser] = await Post.find({
      comments: {
        $elemMatch: {
          _id: { $eq: commentId },
          likeMe: {
            $eq: user._id,
          },
        },
      },
    });
  } catch (e) {
    ctx.throw(500, e);
  }

  // 좋아요를 누르지 않았던 User일 경우
  if (!ExistUser) {
    try {
      const result = await Post.findOneAndUpdate(
        {
          _id: postId,
          'comments._id': commentId,
        },
        {
          // 1. 좋아요 누른 유저 아이디 저장
          $addToSet: { 'comments.$.likeMe': user._id },
          // 2. 좋아요 수 증가
          $inc: { 'comments.$.likes': 1 },
        },
        {
          new: true, // 이 값을 설정하면 업데이트된 데이터를 반환합니다.
          // false 일 때에는 업데이트 되기 전의 데이터를 반환합니다.
        },
      ).exec();
      ctx.body = result;
    } catch (e) {
      ctx.throw(500, e);
    }
  } else {
    try {
      const result = await Post.findOneAndUpdate(
        {
          _id: postId,
          'comments._id': commentId,
        },
        {
          // 1. 좋아요 취소
          $pull: { 'comments.$.likeMe': user._id },
          // 2. 게시물 좋아요 수 감소
          $inc: { 'comments.$.likes': -1 },
        },
        {
          new: true, // 이 값을 설정하면 업데이트된 데이터를 반환합니다.
          // false 일 때에는 업데이트 되기 전의 데이터를 반환합니다.
        },
      ).exec();
      ctx.body = result;
    } catch (e) {
      ctx.throw(500, e);
    }
  }
};
