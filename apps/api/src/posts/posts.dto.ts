import { PostVisibility } from "@prisma/client";
import { IsDateString, IsEnum, IsIn, IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min, MinLength } from "class-validator";
import { Type } from "class-transformer";

export class FeedQueryDto {
  @IsOptional() @IsIn(["popular", "all", "following", "for_you"]) scope: "popular" | "all" | "following" | "for_you" = "all";
  @IsOptional() @IsDateString() from?: string;
  @IsOptional() @IsDateString() to?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(50) pageSize = 20;
}

export class CreatePostDto {
  @IsString() @MinLength(1) @MaxLength(3000) body!: string;
  @IsOptional() @IsEnum(PostVisibility) visibility: PostVisibility = PostVisibility.everybody;
}

export class UpdatePostDto {
  @IsString() @MinLength(1) @MaxLength(3000) body!: string;
}

export class CreatePostCommentDto {
  @IsString() @MinLength(1) @MaxLength(1000) body!: string;
  @IsOptional() @IsUUID() parentId?: string;
}
