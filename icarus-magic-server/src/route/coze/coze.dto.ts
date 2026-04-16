import { IsDefined, IsNotEmpty, IsString, IsNumber, IsIn } from 'class-validator';

/**
 * 文案润色 DTO
 * @param originalText 原始文本
 * @param styleType 风格类型
 * @param polishIntensity 润色强度（0: 轻度, 1: 中度, 2: 重度）
 */
export class PolishTextDto {
    @IsDefined()
    @IsNotEmpty()
    @IsString()
    originalText: string;
    
    @IsDefined()
    @IsNotEmpty()
    @IsString()
    styleType: string;
    
    @IsDefined()
    @IsNumber()
    @IsIn([0, 1, 2])
    polishIntensity: number;
}