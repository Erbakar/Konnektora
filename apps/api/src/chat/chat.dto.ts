import { Type } from "class-transformer";
import { IsBoolean, IsIn, IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min, MinLength } from "class-validator";

export class ConversationMessagesQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) pageSize?: number;
}

export class SendPrivateMessageDto {
  @IsUUID()
  recipientId!: string;

  @IsString()
  @MaxLength(5000)
  body!: string;

  @IsOptional() @IsUUID() replyToId?: string;
}

export class EditPrivateMessageDto { @IsString() @MinLength(1) @MaxLength(5000) body!: string; }
export class MessageReactionDto { @IsString() @IsIn(["❤️", "👍", "😂", "😮", "😢", "🎉"]) emoji!: string; }
export class ConversationPreferenceDto {
  @IsOptional() @IsBoolean() pinned?: boolean;
  @IsOptional() @IsBoolean() muted?: boolean;
  @IsOptional() @IsBoolean() archived?: boolean;
}
