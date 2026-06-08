import { IsArray, IsUUID } from "class-validator";

export class UpdateProfileInterestsDto {
  @IsArray()
  @IsUUID("4", { each: true })
  tagIds!: string[];
}
