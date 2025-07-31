import { Topic } from "encore.dev/pubsub";
import { ConversionEvent } from "../types/events";

// Основной топик для всех событий конвертации
export const conversionEvents = new Topic<ConversionEvent>("conversion-events", {
  deliveryGuarantee: "at-least-once",
});

// Специализированные топики для разных типов событий
export const ruleManagementEvents = new Topic<ConversionEvent>("rule-management-events", {
  deliveryGuarantee: "at-least-once",
});

export const conversionExecutionEvents = new Topic<ConversionEvent>("conversion-execution-events", {
  deliveryGuarantee: "at-least-once",
});

export const autoTriggerEvents = new Topic<ConversionEvent>("auto-trigger-events", {
  deliveryGuarantee: "at-least-once",
});
