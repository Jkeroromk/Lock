/**
 * 中文食物种子数据
 * 所有营养数据均为每 100g 的含量
 * 数据来源：中国食物成分表（第6版）及常见营养标签
 *
 * 运行方式：
 *   npx ts-node --project tsconfig.json prisma/seed-foods.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const foods = [
  // ── 主食 ────────────────────────────────────────────────────────────────
  { name: '白米饭', nameEn: 'Cooked White Rice', calories: 116, protein: 2.6, carbs: 25.6, fat: 0.3 },
  { name: '糙米饭', nameEn: 'Cooked Brown Rice', calories: 124, protein: 2.9, carbs: 26.0, fat: 0.9 },
  { name: '白粥', nameEn: 'Congee', calories: 46, protein: 1.1, carbs: 10.2, fat: 0.1 },
  { name: '皮蛋瘦肉粥', nameEn: 'Century Egg Pork Congee', calories: 72, protein: 5.2, carbs: 10.0, fat: 1.5 },
  { name: '馒头', nameEn: 'Steamed Bun', calories: 223, protein: 7.0, carbs: 47.0, fat: 1.1 },
  { name: '花卷', nameEn: 'Steamed Twisted Bun', calories: 214, protein: 6.5, carbs: 45.0, fat: 1.5 },
  { name: '白面包', nameEn: 'White Bread', calories: 265, protein: 9.0, carbs: 49.0, fat: 3.2 },
  { name: '全麦面包', nameEn: 'Whole Wheat Bread', calories: 247, protein: 13.0, carbs: 41.0, fat: 4.2 },
  { name: '煮面条', nameEn: 'Cooked Noodles', calories: 138, protein: 4.5, carbs: 28.0, fat: 0.7 },
  { name: '炒面', nameEn: 'Stir-fried Noodles', calories: 185, protein: 5.8, carbs: 28.0, fat: 6.0 },
  { name: '蛋炒饭', nameEn: 'Egg Fried Rice', calories: 195, protein: 5.5, carbs: 30.0, fat: 6.0 },
  { name: '扬州炒饭', nameEn: 'Yangzhou Fried Rice', calories: 210, protein: 6.8, carbs: 30.5, fat: 7.5 },
  { name: '油条', nameEn: 'Youtiao Fried Dough', calories: 386, protein: 6.9, carbs: 51.0, fat: 17.6 },
  { name: '燕麦片', nameEn: 'Rolled Oats', calories: 389, protein: 16.9, carbs: 66.3, fat: 6.9 },
  { name: '即食燕麦粥', nameEn: 'Instant Oatmeal', calories: 68, protein: 2.4, carbs: 12.5, fat: 1.0 },
  { name: '玉米', nameEn: 'Sweet Corn', calories: 112, protein: 4.0, carbs: 22.8, fat: 1.2 },
  { name: '红薯', nameEn: 'Sweet Potato', calories: 90, protein: 1.6, carbs: 20.7, fat: 0.1 },
  { name: '土豆', nameEn: 'Potato', calories: 76, protein: 2.0, carbs: 17.2, fat: 0.1 },

  // ── 包点 ────────────────────────────────────────────────────────────────
  { name: '肉包子', nameEn: 'Pork Steamed Bun', calories: 230, protein: 9.8, carbs: 34.0, fat: 6.5 },
  { name: '素包子', nameEn: 'Vegetable Steamed Bun', calories: 185, protein: 6.5, carbs: 35.0, fat: 2.5 },
  { name: '猪肉饺子', nameEn: 'Pork Dumplings', calories: 240, protein: 9.0, carbs: 32.0, fat: 8.0 },
  { name: '韭菜鸡蛋饺子', nameEn: 'Chive Egg Dumplings', calories: 195, protein: 7.5, carbs: 30.0, fat: 5.5 },
  { name: '小笼包', nameEn: 'Xiaolongbao', calories: 218, protein: 9.2, carbs: 28.5, fat: 7.8 },
  { name: '锅贴', nameEn: 'Pan-fried Dumplings', calories: 255, protein: 9.5, carbs: 33.0, fat: 9.0 },
  { name: '春卷', nameEn: 'Spring Roll', calories: 232, protein: 5.0, carbs: 24.0, fat: 13.0 },
  { name: '粽子', nameEn: 'Sticky Rice Dumpling', calories: 212, protein: 4.8, carbs: 42.0, fat: 2.8 },
  { name: '汤圆', nameEn: 'Glutinous Rice Ball', calories: 175, protein: 3.2, carbs: 34.0, fat: 3.5 },
  { name: '月饼（五仁）', nameEn: 'Five-Nut Mooncake', calories: 416, protein: 8.0, carbs: 64.0, fat: 15.0 },
  { name: '煎饼果子', nameEn: 'Jianbing', calories: 240, protein: 9.0, carbs: 33.0, fat: 8.5 },

  // ── 常见中国菜肴 ─────────────────────────────────────────────────────────
  { name: '番茄炒鸡蛋', nameEn: 'Tomato and Egg Stir-fry', calories: 95, protein: 6.2, carbs: 6.5, fat: 5.0 },
  { name: '宫保鸡丁', nameEn: 'Kung Pao Chicken', calories: 165, protein: 14.0, carbs: 8.0, fat: 8.5 },
  { name: '麻婆豆腐', nameEn: 'Mapo Tofu', calories: 112, protein: 8.0, carbs: 5.0, fat: 7.0 },
  { name: '红烧肉', nameEn: 'Red Braised Pork Belly', calories: 395, protein: 14.8, carbs: 10.2, fat: 33.0 },
  { name: '红烧排骨', nameEn: 'Braised Pork Ribs', calories: 278, protein: 16.5, carbs: 8.0, fat: 20.0 },
  { name: '回锅肉', nameEn: 'Twice-cooked Pork', calories: 320, protein: 15.0, carbs: 6.0, fat: 26.0 },
  { name: '鱼香肉丝', nameEn: 'Fish-flavored Pork Shreds', calories: 175, protein: 12.0, carbs: 10.0, fat: 9.5 },
  { name: '青椒肉丝', nameEn: 'Pork with Green Pepper', calories: 148, protein: 13.0, carbs: 6.0, fat: 8.0 },
  { name: '糖醋里脊', nameEn: 'Sweet and Sour Pork Tenderloin', calories: 260, protein: 14.0, carbs: 28.0, fat: 10.0 },
  { name: '水煮肉片', nameEn: 'Boiled Pork Slices in Spicy Broth', calories: 195, protein: 16.0, carbs: 5.0, fat: 13.0 },
  { name: '夫妻肺片', nameEn: 'Fuqi Feipian (Beef in Chili Sauce)', calories: 142, protein: 14.5, carbs: 4.5, fat: 7.5 },
  { name: '清蒸鱼', nameEn: 'Steamed Fish', calories: 105, protein: 17.0, carbs: 1.5, fat: 3.5 },
  { name: '酸菜鱼', nameEn: 'Fish with Sauerkraut', calories: 128, protein: 14.0, carbs: 4.0, fat: 6.5 },
  { name: '干煸豆角', nameEn: 'Dry-fried Green Beans', calories: 110, protein: 4.5, carbs: 10.0, fat: 6.0 },
  { name: '炒土豆丝', nameEn: 'Stir-fried Potato Shreds', calories: 95, protein: 2.0, carbs: 16.5, fat: 3.0 },
  { name: '地三鲜', nameEn: 'Three Earthen Treasures (Eggplant, Potato, Pepper)', calories: 115, protein: 2.5, carbs: 14.0, fat: 5.5 },
  { name: '蒜蓉炒青菜', nameEn: 'Garlic Stir-fried Greens', calories: 55, protein: 2.5, carbs: 5.5, fat: 2.8 },
  { name: '凉拌黄瓜', nameEn: 'Cucumber Salad', calories: 35, protein: 1.0, carbs: 5.0, fat: 1.5 },
  { name: '叉烧', nameEn: 'Char Siu BBQ Pork', calories: 272, protein: 22.0, carbs: 12.0, fat: 14.5 },
  { name: '烤鸭', nameEn: 'Roast Duck', calories: 266, protein: 19.8, carbs: 0, fat: 20.5 },
  { name: '北京烤鸭饼', nameEn: 'Peking Duck Pancake Wrap', calories: 210, protein: 10.0, carbs: 22.0, fat: 9.0 },
  { name: '麻辣烫（均值）', nameEn: 'Mala Hot Pot (average)', calories: 130, protein: 8.0, carbs: 12.0, fat: 6.0 },
  { name: '火锅涮牛肉', nameEn: 'Hot Pot Beef Slices', calories: 145, protein: 19.0, carbs: 0, fat: 7.5 },
  { name: '酸辣汤', nameEn: 'Hot and Sour Soup', calories: 55, protein: 3.5, carbs: 6.0, fat: 1.8 },
  { name: '蛋花汤', nameEn: 'Egg Drop Soup', calories: 40, protein: 3.0, carbs: 3.5, fat: 1.5 },
  { name: '豆腐脑', nameEn: 'Tofu Pudding', calories: 47, protein: 4.5, carbs: 3.5, fat: 1.8 },

  // ── 肉类 ────────────────────────────────────────────────────────────────
  { name: '猪肉（瘦）', nameEn: 'Lean Pork', calories: 143, protein: 20.3, carbs: 0, fat: 6.2 },
  { name: '猪肉（肥瘦）', nameEn: 'Pork (mixed)', calories: 395, protein: 13.2, carbs: 2.4, fat: 37.0 },
  { name: '猪里脊', nameEn: 'Pork Tenderloin', calories: 130, protein: 21.2, carbs: 0, fat: 4.6 },
  { name: '鸡胸肉', nameEn: 'Chicken Breast', calories: 133, protein: 23.7, carbs: 2.5, fat: 3.4 },
  { name: '鸡腿肉', nameEn: 'Chicken Thigh', calories: 181, protein: 18.7, carbs: 0, fat: 11.6 },
  { name: '鸭肉', nameEn: 'Duck Meat', calories: 240, protein: 15.5, carbs: 0, fat: 19.7 },
  { name: '牛肉（瘦）', nameEn: 'Lean Beef', calories: 106, protein: 20.2, carbs: 0, fat: 2.3 },
  { name: '牛排', nameEn: 'Beef Steak', calories: 175, protein: 26.0, carbs: 0, fat: 7.5 },
  { name: '羊肉', nameEn: 'Lamb', calories: 203, protein: 19.0, carbs: 0, fat: 14.0 },

  // ── 水产 ────────────────────────────────────────────────────────────────
  { name: '草鱼', nameEn: 'Grass Carp', calories: 113, protein: 16.6, carbs: 0, fat: 5.2 },
  { name: '鲈鱼', nameEn: 'Sea Bass', calories: 105, protein: 18.6, carbs: 0, fat: 3.4 },
  { name: '三文鱼', nameEn: 'Salmon', calories: 208, protein: 20.1, carbs: 0, fat: 13.4 },
  { name: '金枪鱼', nameEn: 'Tuna', calories: 116, protein: 25.0, carbs: 0, fat: 1.0 },
  { name: '虾', nameEn: 'Shrimp', calories: 93, protein: 18.6, carbs: 0, fat: 0.8 },
  { name: '螃蟹', nameEn: 'Crab', calories: 103, protein: 17.5, carbs: 2.3, fat: 2.6 },
  { name: '扇贝', nameEn: 'Scallop', calories: 60, protein: 11.1, carbs: 2.6, fat: 0.6 },

  // ── 蛋豆 ────────────────────────────────────────────────────────────────
  { name: '鸡蛋', nameEn: 'Chicken Egg', calories: 144, protein: 13.3, carbs: 2.8, fat: 8.8 },
  { name: '水煮蛋', nameEn: 'Hard Boiled Egg', calories: 155, protein: 12.6, carbs: 1.1, fat: 10.6 },
  { name: '煎蛋', nameEn: 'Fried Egg', calories: 196, protein: 13.6, carbs: 0.4, fat: 14.8 },
  { name: '豆腐（北豆腐）', nameEn: 'Firm Tofu', calories: 76, protein: 8.1, carbs: 1.9, fat: 4.2 },
  { name: '豆腐（南豆腐/嫩豆腐）', nameEn: 'Soft Tofu', calories: 50, protein: 5.0, carbs: 2.5, fat: 2.5 },
  { name: '豆浆', nameEn: 'Soy Milk', calories: 33, protein: 3.0, carbs: 2.0, fat: 1.5 },
  { name: '纳豆', nameEn: 'Natto', calories: 212, protein: 17.7, carbs: 14.4, fat: 11.0 },

  // ── 蔬菜 ────────────────────────────────────────────────────────────────
  { name: '西红柿', nameEn: 'Tomato', calories: 17, protein: 0.9, carbs: 3.9, fat: 0.2 },
  { name: '黄瓜', nameEn: 'Cucumber', calories: 15, protein: 0.8, carbs: 2.9, fat: 0.1 },
  { name: '胡萝卜', nameEn: 'Carrot', calories: 37, protein: 0.9, carbs: 8.8, fat: 0.2 },
  { name: '花椰菜', nameEn: 'Cauliflower', calories: 24, protein: 2.0, carbs: 5.0, fat: 0.3 },
  { name: '西兰花', nameEn: 'Broccoli', calories: 33, protein: 2.8, carbs: 6.6, fat: 0.4 },
  { name: '菠菜', nameEn: 'Spinach', calories: 23, protein: 2.9, carbs: 3.6, fat: 0.4 },
  { name: '生菜', nameEn: 'Lettuce', calories: 13, protein: 1.4, carbs: 2.1, fat: 0.2 },
  { name: '白菜', nameEn: 'Chinese Cabbage', calories: 15, protein: 1.4, carbs: 2.4, fat: 0.2 },
  { name: '青椒', nameEn: 'Green Pepper', calories: 22, protein: 1.0, carbs: 5.0, fat: 0.2 },
  { name: '茄子', nameEn: 'Eggplant', calories: 24, protein: 1.0, carbs: 5.5, fat: 0.2 },
  { name: '洋葱', nameEn: 'Onion', calories: 40, protein: 1.1, carbs: 9.3, fat: 0.1 },
  { name: '韭菜', nameEn: 'Chinese Chives', calories: 26, protein: 2.4, carbs: 4.6, fat: 0.4 },
  { name: '蘑菇', nameEn: 'Mushroom', calories: 22, protein: 3.1, carbs: 3.3, fat: 0.3 },
  { name: '香菇', nameEn: 'Shiitake Mushroom', calories: 34, protein: 2.2, carbs: 6.8, fat: 0.5 },
  { name: '木耳', nameEn: 'Black Fungus (dried)', calories: 205, protein: 12.1, carbs: 65.6, fat: 1.5 },
  { name: '豆芽', nameEn: 'Bean Sprouts', calories: 18, protein: 1.8, carbs: 3.0, fat: 0.1 },

  // ── 水果 ────────────────────────────────────────────────────────────────
  { name: '苹果', nameEn: 'Apple', calories: 52, protein: 0.3, carbs: 13.8, fat: 0.2 },
  { name: '香蕉', nameEn: 'Banana', calories: 89, protein: 1.1, carbs: 23.0, fat: 0.3 },
  { name: '橙子', nameEn: 'Orange', calories: 47, protein: 0.9, carbs: 11.8, fat: 0.1 },
  { name: '西瓜', nameEn: 'Watermelon', calories: 30, protein: 0.6, carbs: 7.6, fat: 0.2 },
  { name: '葡萄', nameEn: 'Grapes', calories: 69, protein: 0.7, carbs: 18.1, fat: 0.2 },
  { name: '草莓', nameEn: 'Strawberry', calories: 32, protein: 0.7, carbs: 7.7, fat: 0.3 },
  { name: '芒果', nameEn: 'Mango', calories: 65, protein: 0.5, carbs: 17.0, fat: 0.3 },
  { name: '梨', nameEn: 'Pear', calories: 44, protein: 0.5, carbs: 11.0, fat: 0.1 },
  { name: '猕猴桃', nameEn: 'Kiwifruit', calories: 61, protein: 1.1, carbs: 14.7, fat: 0.5 },
  { name: '桃子', nameEn: 'Peach', calories: 39, protein: 0.9, carbs: 9.5, fat: 0.3 },
  { name: '荔枝', nameEn: 'Lychee', calories: 66, protein: 0.8, carbs: 16.5, fat: 0.4 },
  { name: '龙眼', nameEn: 'Longan', calories: 60, protein: 1.2, carbs: 15.1, fat: 0.1 },
  { name: '柚子', nameEn: 'Pomelo', calories: 38, protein: 0.8, carbs: 9.5, fat: 0.2 },

  // ── 奶制品 ──────────────────────────────────────────────────────────────
  { name: '全脂牛奶', nameEn: 'Whole Milk', calories: 61, protein: 3.2, carbs: 4.8, fat: 3.2 },
  { name: '脱脂牛奶', nameEn: 'Skim Milk', calories: 35, protein: 3.5, carbs: 5.0, fat: 0.1 },
  { name: '全脂酸奶', nameEn: 'Whole Milk Yogurt', calories: 59, protein: 3.5, carbs: 5.0, fat: 3.3 },
  { name: '低脂酸奶', nameEn: 'Low-fat Yogurt', calories: 40, protein: 4.0, carbs: 5.5, fat: 0.5 },
  { name: '奶酪', nameEn: 'Cheese', calories: 371, protein: 22.0, carbs: 1.3, fat: 31.0 },
  { name: '黄油', nameEn: 'Butter', calories: 717, protein: 0.9, carbs: 0.1, fat: 81.1 },

  // ── 坚果零食 ────────────────────────────────────────────────────────────
  { name: '花生', nameEn: 'Peanuts', calories: 567, protein: 25.8, carbs: 16.1, fat: 49.2 },
  { name: '核桃', nameEn: 'Walnuts', calories: 654, protein: 15.2, carbs: 13.7, fat: 65.2 },
  { name: '杏仁', nameEn: 'Almonds', calories: 579, protein: 21.2, carbs: 21.7, fat: 49.9 },
  { name: '腰果', nameEn: 'Cashews', calories: 553, protein: 18.2, carbs: 30.2, fat: 43.9 },
  { name: '瓜子（葵花籽）', nameEn: 'Sunflower Seeds', calories: 584, protein: 20.8, carbs: 20.0, fat: 51.5 },
  { name: '薯片', nameEn: 'Potato Chips', calories: 536, protein: 7.0, carbs: 53.0, fat: 35.0 },
  { name: '薯条', nameEn: 'French Fries', calories: 312, protein: 3.4, carbs: 41.4, fat: 15.0 },
  { name: '奥利奥饼干', nameEn: 'Oreo Cookies', calories: 480, protein: 5.0, carbs: 70.0, fat: 21.0 },
  { name: '蛋糕', nameEn: 'Cake', calories: 347, protein: 5.0, carbs: 52.0, fat: 14.0 },
  { name: '巧克力', nameEn: 'Chocolate', calories: 546, protein: 4.9, carbs: 59.4, fat: 31.3 },
  { name: '冰淇淋', nameEn: 'Ice Cream', calories: 207, protein: 3.5, carbs: 24.5, fat: 11.0 },
  { name: '果冻', nameEn: 'Jelly', calories: 66, protein: 0.5, carbs: 16.5, fat: 0.1 },

  // ── 饮品 ────────────────────────────────────────────────────────────────
  { name: '可乐', nameEn: 'Coca-Cola', calories: 37, protein: 0, carbs: 9.6, fat: 0 },
  { name: '雪碧', nameEn: 'Sprite', calories: 39, protein: 0, carbs: 10.1, fat: 0 },
  { name: '橙汁', nameEn: 'Orange Juice', calories: 45, protein: 0.7, carbs: 10.4, fat: 0.2 },
  { name: '绿茶', nameEn: 'Green Tea', calories: 1, protein: 0.2, carbs: 0.2, fat: 0 },
  { name: '奶茶（全糖）', nameEn: 'Bubble Milk Tea (full sugar)', calories: 80, protein: 1.5, carbs: 14.5, fat: 2.0 },
  { name: '美式咖啡', nameEn: 'Americano', calories: 4, protein: 0.3, carbs: 0.7, fat: 0 },
  { name: '拿铁咖啡', nameEn: 'Latte', calories: 54, protein: 3.0, carbs: 5.5, fat: 2.0 },
  { name: '啤酒', nameEn: 'Beer', calories: 43, protein: 0.5, carbs: 3.6, fat: 0 },
  { name: '红酒', nameEn: 'Red Wine', calories: 85, protein: 0.1, carbs: 2.6, fat: 0 },
  { name: '椰子水', nameEn: 'Coconut Water', calories: 19, protein: 0.7, carbs: 3.7, fat: 0.2 },
  { name: '运动饮料', nameEn: 'Sports Drink', calories: 26, protein: 0, carbs: 6.4, fat: 0 },

  // ── 快餐 / 西式 ──────────────────────────────────────────────────────────
  { name: '汉堡包', nameEn: 'Hamburger', calories: 250, protein: 13.0, carbs: 25.0, fat: 10.0 },
  { name: '芝士汉堡', nameEn: 'Cheeseburger', calories: 295, protein: 15.5, carbs: 25.5, fat: 14.0 },
  { name: '炸鸡块', nameEn: 'Chicken Nuggets', calories: 260, protein: 14.0, carbs: 16.0, fat: 15.0 },
  { name: '披萨（芝士）', nameEn: 'Cheese Pizza', calories: 266, protein: 11.0, carbs: 33.0, fat: 10.0 },
  { name: '三明治', nameEn: 'Sandwich', calories: 210, protein: 10.0, carbs: 26.0, fat: 7.0 },
  { name: '沙拉（蔬菜）', nameEn: 'Vegetable Salad', calories: 20, protein: 1.5, carbs: 3.5, fat: 0.2 },
  { name: '凯撒沙拉', nameEn: 'Caesar Salad', calories: 110, protein: 5.0, carbs: 8.0, fat: 7.5 },
];

async function main() {
  console.log(`开始写入 ${foods.length} 条中文食物数据...`);

  let inserted = 0;
  let skipped = 0;

  for (const food of foods) {
    try {
      await prisma.food.upsert({
        where: {
          // 本地食物用 name 作为唯一键（fdcId 为 null 时 unique 不冲突）
          // 实际使用 name 做查重
          fdcId: `LOCAL_${food.name}`,
        },
        update: {
          calories: food.calories,
          protein: food.protein,
          carbs: food.carbs,
          fat: food.fat,
          nameEn: food.nameEn,
        },
        create: {
          name: food.name,
          nameEn: food.nameEn,
          calories: food.calories,
          protein: food.protein,
          carbs: food.carbs,
          fat: food.fat,
          source: 'LOCAL',
          fdcId: `LOCAL_${food.name}`,
        },
      });
      inserted++;
    } catch (e) {
      console.error(`跳过 ${food.name}:`, e);
      skipped++;
    }
  }

  console.log(`✓ 完成：写入 ${inserted} 条，跳过 ${skipped} 条`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
