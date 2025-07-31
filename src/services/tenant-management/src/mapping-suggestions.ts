import { getEntitySchema, EntityFieldDefinition } from './extensible-fields';
import { MappingSuggestions, FieldMappingSuggestion, ExtensionFieldMappingSuggestion } from './types/entity-conversion';

/**
 * Генерация предложений для маппинга полей конвертации
 * Анализирует схемы исходной и целевой сущностей для создания умных предложений
 */
export async function generateMappingSuggestions(
  tenantId: string,
  sourceEntity: string,
  targetEntity: string
): Promise<MappingSuggestions> {
  console.log(`[MappingSuggestions] generateMappingSuggestions called for ${sourceEntity} -> ${targetEntity}`);
  
  try {
    // Получаем схемы исходной и целевой сущностей
    const sourceSchema = await getEntitySchema(tenantId, sourceEntity);
    const targetSchema = await getEntitySchema(tenantId, targetEntity);
    
    console.log(`[MappingSuggestions] Schemas loaded - source: ${sourceSchema.length} fields, target: ${targetSchema.length} fields`);
    
    // Генерируем предложения для основных полей
    const fieldSuggestions: FieldMappingSuggestion[] = [];
    const unmappedSourceFields: string[] = [];
    const unmappedTargetFields: string[] = [];
    
    // Создаем карту целевых полей для быстрого поиска
    const targetFieldMap = new Map(targetSchema.map(field => [field.value, field]));
    
    // Анализируем каждое поле исходной сущности
    for (const sourceField of sourceSchema) {
      const targetField = targetFieldMap.get(sourceField.value);
      
      if (targetField) {
        // Точное совпадение по имени поля
        fieldSuggestions.push({
          source_field: sourceField.value,
          target_field: targetField.value,
          confidence_score: 90,
          match_type: 'exact',
          description: `Точное совпадение поля ${sourceField.label}`
        });
        
        // Удаляем найденное поле из карты, чтобы отследить несопоставленные целевые поля
        targetFieldMap.delete(sourceField.value);
      } else {
        // Ищем похожие поля по имени (частичное совпадение)
        let bestMatch: EntityFieldDefinition | null = null;
        let bestScore = 0;
        
        for (const targetField of targetSchema) {
          const similarity = calculateFieldSimilarity(sourceField.value, targetField.value);
          if (similarity > bestScore && similarity > 0.6) {
            bestScore = similarity;
            bestMatch = targetField;
          }
        }
        
        if (bestMatch) {
          fieldSuggestions.push({
            source_field: sourceField.value,
            target_field: bestMatch.value,
            confidence_score: Math.round(bestScore * 100),
            match_type: 'similar',
            description: `Похожее поле ${bestMatch.label}`
          });
          
          // Удаляем найденное поле из карты
          targetFieldMap.delete(bestMatch.value);
        } else {
          // Нет подходящего поля
          unmappedSourceFields.push(sourceField.value);
        }
      }
    }
    
    // Оставшиеся целевые поля считаются несопоставленными
    unmappedTargetFields.push(...Array.from(targetFieldMap.keys()));
    
    // Генерируем предложения для расширяемых полей
    const extensionFieldSuggestions: ExtensionFieldMappingSuggestion[] = [];
    
    // TODO: Реализовать логику для расширяемых полей после интеграции с extensible-fields
    
    console.log(`[MappingSuggestions] Generated ${fieldSuggestions.length} field suggestions`);
    
    return {
      field_suggestions: fieldSuggestions,
      extension_field_suggestions: extensionFieldSuggestions,
      unmapped_source_fields: unmappedSourceFields,
      unmapped_target_fields: unmappedTargetFields
    };
  } catch (error) {
    console.error('[MappingSuggestions] Error generating mapping suggestions:', error);
    throw error;
  }
}

/**
 * Вычисление степени схожести двух имен полей
 * Возвращает значение от 0 до 1, где 1 - полное совпадение
 */
function calculateFieldSimilarity(field1: string, field2: string): number {
  // Простая реализация на основе расстояния Левенштейна
  const distance = levenshteinDistance(field1.toLowerCase(), field2.toLowerCase());
  const maxLength = Math.max(field1.length, field2.length);
  
  if (maxLength === 0) return 1;
  
  return 1 - (distance / maxLength);
}

/**
 * Расстояние Левенштейна между двумя строками
 */
function levenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(0));
  
  for (let i = 0; i <= str1.length; i++) {
    matrix[0]![i] = i;
  }
  
  for (let j = 0; j <= str2.length; j++) {
    matrix[j]![0] = j;
  }
  
  for (let j = 1; j <= str2.length; j++) {
    for (let i = 1; i <= str1.length; i++) {
      const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
      const insertion = (matrix[j]![i - 1] ?? 0) + 1; // insertion
      const deletion = (matrix[j - 1]![i] ?? 0) + 1; // deletion
      const substitution = (matrix[j - 1]![i - 1] ?? 0) + indicator; // substitution
      matrix[j]![i] = Math.min(insertion, deletion, substitution);
    }
  }
  
  return matrix[str2.length]![str1.length]!;
}
