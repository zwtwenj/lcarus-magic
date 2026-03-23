import React, { useEffect, useState } from "react";
import { AbsoluteFill, staticFile } from "remotion";
import { Lottie, LottieAnimationData } from "@remotion/lottie";
import { delayRender, continueRender, cancelRender } from "remotion";
import { z } from "zod";

// 定义 schema
export const lottieTextSchema = z.object({
    id: z.string(),
    props: z.record(z.string(), z.string())
});

// Lottie 字幕组件，支持文本替换
export const LottieText: React.FC<z.infer<typeof lottieTextSchema>> = ({ id, props }) => {
    const [animationData, setAnimationData] = useState<LottieAnimationData | null>(null);
    const [handle] = useState(() => delayRender("Loading Lottie text animation"));

    // 递归查找并替换文本占位符
    const replaceTextPlaceholders = (obj: any, placeholder: string, replacement: string): void => {
        if (obj === null || obj === undefined) return;

        if (typeof obj === 'string') {
            // 如果是字符串且包含占位符，直接替换
            if (obj.includes(placeholder)) {
                return; // 字符串本身不会被修改，需要在对象属性中修改
            }
        } else if (Array.isArray(obj)) {
            // 如果是数组，递归处理每个元素
            obj.forEach((item) => replaceTextPlaceholders(item, placeholder, replacement));
        } else if (typeof obj === 'object') {
            // 如果是对象，遍历所有属性
            Object.keys(obj).forEach((key) => {
                const value = obj[key];
                // 如果值是字符串且包含占位符，直接替换
                if (typeof value === 'string' && value.includes(placeholder)) {
                    obj[key] = value.replace(placeholder, replacement);
                    console.log(`替换 ${key}: "${value}" -> "${obj[key]}"`);
                } else {
                    // 否则递归处理
                    replaceTextPlaceholders(value, placeholder, replacement);
                }
            });
        }
    };

    useEffect(() => {
        fetch(staticFile("AEConfig/AEConfig.json"))
            .then((res) => res.json())
            .then((config) => {
                const configItem = config[id];
                if (!configItem) {
                    throw new Error(`Config item not found for id: ${id}`);
                }
                const filePath = configItem.path;
                if (!filePath) {
                    throw new Error(`File path not found in config for id: ${id}`);
                }
                return fetch(staticFile(filePath))
                    .then((res) => res.json())
                    .then((jsonData) => {
                        const modifiedData = JSON.parse(JSON.stringify(jsonData));
                        console.log(modifiedData);
                        
                        // 获取 props 映射：优先使用 configItem.props，否则从顶层提取（兼容旧格式）
                        let propsMapping: Record<string, string> = {};
                        if (configItem.props && typeof configItem.props === 'object') {
                            // 新格式：使用 props 对象
                            propsMapping = configItem.props;
                        }
                        
                        // 使用 props 映射进行文本替换
                        Object.keys(propsMapping).forEach((key) => {
                            const placeholder = propsMapping[key];
                            const replacement = (props as Record<string, string>)[key];
                            if (replacement && placeholder) {
                                replaceTextPlaceholders(modifiedData, placeholder, replacement);
                            }
                        });
                        
                        setAnimationData(modifiedData);
                        continueRender(handle);
                    });
            })
            .catch((err) => {
                console.error("Failed to load Lottie text animation:", err);
                cancelRender(err);
            });
    }, [handle, id, JSON.stringify(props)]);
    
    // 在数据加载完成之前，不返回任何内容
    // delayRender 会阻止 Remotion 继续渲染，直到 continueRender 被调用
    if (!animationData) {
        return null;
    }

    return (
        <AbsoluteFill
            style={{
                justifyContent: "center",
                alignItems: "center",
            }}
        >
            <Lottie
                animationData={animationData}
                loop={true}
                playbackRate={1}
                renderer="svg"
                style={{
                    width: "100%",
                    height: "100%",
                }}
            />
        </AbsoluteFill>
    );
};
