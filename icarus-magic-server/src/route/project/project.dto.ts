import { IsDefined, IsNotEmpty, IsString } from 'class-validator';

export class CreateProjectDto {
    @IsDefined()
    @IsNotEmpty()
    @IsString()
    name: string;
    
    @IsDefined()
    @IsNotEmpty()
    @IsString()
    description: string;

    @IsDefined()
    @IsNotEmpty()
    @IsString()
    userId: string;
}
