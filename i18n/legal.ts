import type { LanguageCode } from './locales';

export interface LegalSection {
  title: string;
  body: string;
}

export interface LegalContent {
  intro: string;
  sections: LegalSection[];
  lastUpdated: string;
}

// ── Privacy Policy ───────────────────────────────────────────────────────────

const privacyContent: Record<LanguageCode, LegalContent> = {
  'zh-CN': {
    intro: 'Lock（以下简称"我们"）重视您的隐私。本政策说明我们如何收集、使用和保护您的个人信息。',
    lastUpdated: '最后更新：2026 年 1 月 1 日',
    sections: [
      { title: '我们收集的信息', body: '我们收集您主动提供的信息：\n\n• 账户信息：邮箱、姓名、用户名\n• 身体数据：身高、体重、年龄、性别\n• 饮食记录：食物名称、卡路里及营养成分\n• 健康数据：步数、消耗热量（需您授权）\n• 设备信息：设备类型、操作系统版本' },
      { title: '我们如何使用您的信息', body: '• 提供和改进 Lock 核心功能\n• 计算每日卡路里目标和营养建议\n• 生成 AI 饮食分析报告\n• 显示好友排行榜和社交功能\n• 发送每日餐食提醒（需您主动开启）\n• 处理订阅和支付事务' },
      { title: '信息共享', body: '我们不会出售您的个人信息。仅在以下情况共享：\n\n• 服务提供商：Clerk（认证）、Fireworks AI（图像识别）、RevenueCat（订阅）\n• 社交功能：用户名、头像和今日卡路里对好友可见\n• 法律要求：配合执法机构的合法要求' },
      { title: '数据存储与安全', body: '您的数据存储在受保护的云服务器上，采用行业标准加密传输和存储。密码通过 Clerk 安全存储，我们无法访问明文密码。' },
      { title: '健康数据', body: '健康数据仅在您明确授权后从 Apple Health 或 Google Fit 同步，仅用于展示运动进度，不用于广告或出售给第三方。' },
      { title: '您的权利', body: '您有权：\n\n• 访问和下载您的个人数据\n• 更正不准确的个人信息\n• 删除账户和所有相关数据\n• 撤回对健康数据访问的授权\n\n联系：support@lock-app.com' },
      { title: '儿童隐私', body: 'Lock 不面向 13 岁以下儿童。如发现意外收集了此类信息，请立即联系我们。' },
      { title: '隐私政策更新', body: '重大变更时，我们将通过应用内通知或邮件告知您。继续使用 Lock 即表示同意更新后的隐私政策。' },
    ],
  },
  'en-US': {
    intro: 'Lock ("we") values your privacy. This policy explains how we collect, use, and protect your personal information.',
    lastUpdated: 'Last updated: January 1, 2026',
    sections: [
      { title: 'Information We Collect', body: 'We collect information you provide:\n\n• Account info: email, name, username\n• Body data: height, weight, age, gender\n• Diet records: food names, calories, nutrition\n• Health data: steps, active calories (with your permission)\n• Device info: device type, OS version' },
      { title: 'How We Use Your Information', body: '• Provide and improve Lock\'s core features\n• Calculate daily calorie goals and nutrition advice\n• Generate AI diet analysis reports\n• Show friend leaderboards and social features\n• Send daily meal reminders (opt-in)\n• Process subscriptions and payments' },
      { title: 'Information Sharing', body: 'We do not sell your personal data. We share only with:\n\n• Service providers: Clerk (auth), Fireworks AI (image recognition), RevenueCat (subscriptions)\n• Social features: your username, avatar, and today\'s calories are visible to friends\n• Legal requirements: compliance with lawful requests' },
      { title: 'Data Storage & Security', body: 'Your data is stored on protected cloud servers using industry-standard encryption. Passwords are managed by Clerk — we never have access to plaintext passwords.' },
      { title: 'Health Data', body: 'Health data is only synced from Apple Health or Google Fit after your explicit authorization. It is used solely to show your activity progress and is never sold or used for advertising.' },
      { title: 'Your Rights', body: 'You have the right to:\n\n• Access and download your personal data\n• Correct inaccurate information\n• Delete your account and all associated data\n• Revoke health data access at any time\n\nContact: support@lock-app.com' },
      { title: 'Children\'s Privacy', body: 'Lock is not directed to children under 13. If we become aware of such data being collected, we will delete it immediately.' },
      { title: 'Policy Updates', body: 'We will notify you of significant changes via in-app notification or email. Continued use of Lock means you accept the updated policy.' },
    ],
  },
  'zh-TW': {
    intro: 'Lock（以下簡稱「我們」）重視您的隱私。本政策說明我們如何收集、使用和保護您的個人信息。',
    lastUpdated: '最後更新：2026 年 1 月 1 日',
    sections: [
      { title: '我們收集的信息', body: '我們收集您主動提供的信息：\n\n• 賬戶信息：郵箱、姓名、用戶名\n• 身體數據：身高、體重、年齡、性別\n• 飲食記錄：食物名稱、卡路里及營養成分\n• 健康數據：步數、消耗熱量（需您授權）\n• 設備信息：設備類型、操作系統版本' },
      { title: '我們如何使用您的信息', body: '• 提供和改進 Lock 核心功能\n• 計算每日卡路里目標和營養建議\n• 生成 AI 飲食分析報告\n• 顯示好友排行榜和社交功能\n• 發送每日餐食提醒（需您主動開啟）\n• 處理訂閱和支付事務' },
      { title: '信息共享', body: '我們不會出售您的個人信息。僅在以下情況共享：\n\n• 服務提供商：Clerk、Fireworks AI、RevenueCat\n• 社交功能：用戶名、頭像和今日卡路里對好友可見\n• 法律要求：配合執法機構的合法要求' },
      { title: '數據存儲與安全', body: '您的數據存儲在受保護的雲服務器上，採用行業標準加密。密碼通過 Clerk 安全存儲。' },
      { title: '健康數據', body: '健康數據僅在您明確授權後從 Apple Health 或 Google Fit 同步，不用於廣告或出售給第三方。' },
      { title: '您的權利', body: '您有權訪問、更正或刪除您的個人數據，並隨時撤回健康數據授權。\n\n聯繫：support@lock-app.com' },
      { title: '兒童隱私', body: 'Lock 不面向 13 歲以下兒童。如發現意外收集了此類信息，請立即聯繫我們。' },
      { title: '隱私政策更新', body: '重大變更時，我們將通過應用内通知或郵件告知您。' },
    ],
  },
  'ja-JP': {
    intro: 'Lock（以下「当社」）はお客様のプライバシーを重視します。本ポリシーでは、個人情報の収集・使用・保護方法について説明します。',
    lastUpdated: '最終更新：2026年1月1日',
    sections: [
      { title: '収集する情報', body: 'お客様が提供する情報：\n\n• アカウント情報：メール、名前、ユーザー名\n• 身体データ：身長、体重、年齢、性別\n• 食事記録：食品名、カロリー、栄養素\n• 健康データ：歩数、活動カロリー（許可後）\n• デバイス情報：デバイス種類、OSバージョン' },
      { title: '情報の使用方法', body: '• Lockのコア機能の提供・改善\n• 日次カロリー目標と栄養アドバイスの計算\n• AI食事分析レポートの生成\n• 友達ランキングとソーシャル機能の表示\n• 日次食事リマインダーの送信（オプトイン）\n• サブスクリプションと支払いの処理' },
      { title: '情報の共有', body: '個人データを販売することはありません。共有先：\n\n• サービスプロバイダー：Clerk、Fireworks AI、RevenueCat\n• ソーシャル機能：ユーザー名、アバター、今日のカロリーは友達に表示\n• 法的要件：合法的な要求への対応' },
      { title: 'データの保存とセキュリティ', body: 'データは業界標準の暗号化を使用して保護されたクラウドサーバーに保存されます。' },
      { title: '健康データ', body: '健康データはApple HealthまたはGoogle Fitから明示的な許可後のみ同期され、広告や第三者への販売には使用されません。' },
      { title: 'お客様の権利', body: '個人データへのアクセス、修正、削除、健康データ許可の撤回が可能です。\n\nお問い合わせ：support@lock-app.com' },
      { title: '児童のプライバシー', body: 'Lockは13歳未満の児童を対象としていません。' },
      { title: 'ポリシーの更新', body: '重大な変更はアプリ内通知またはメールでお知らせします。' },
    ],
  },
  'ko-KR': {
    intro: 'Lock("당사")은 귀하의 개인정보를 중요하게 생각합니다. 본 정책은 개인정보의 수집, 사용 및 보호 방법을 설명합니다.',
    lastUpdated: '최종 업데이트: 2026년 1월 1일',
    sections: [
      { title: '수집하는 정보', body: '귀하가 제공하는 정보:\n\n• 계정 정보: 이메일, 이름, 사용자명\n• 신체 데이터: 키, 체중, 나이, 성별\n• 식단 기록: 음식명, 칼로리, 영양소\n• 건강 데이터: 걸음수, 활동 칼로리 (허가 후)\n• 기기 정보: 기기 종류, OS 버전' },
      { title: '정보 사용 방법', body: '• Lock 핵심 기능 제공 및 개선\n• 일일 칼로리 목표 및 영양 조언 계산\n• AI 식단 분석 보고서 생성\n• 친구 순위 및 소셜 기능 표시\n• 일일 식사 알림 전송 (선택)\n• 구독 및 결제 처리' },
      { title: '정보 공유', body: '개인 데이터를 판매하지 않습니다. 공유 대상:\n\n• 서비스 제공업체: Clerk, Fireworks AI, RevenueCat\n• 소셜 기능: 사용자명, 아바타, 오늘의 칼로리는 친구에게 공개\n• 법적 요구사항 준수' },
      { title: '데이터 저장 및 보안', body: '데이터는 업계 표준 암호화를 사용하는 보호된 클라우드 서버에 저장됩니다.' },
      { title: '건강 데이터', body: '건강 데이터는 명시적 허가 후에만 Apple Health 또는 Google Fit에서 동기화되며 광고나 판매에 사용되지 않습니다.' },
      { title: '귀하의 권리', body: '개인 데이터 접근, 수정, 삭제 및 건강 데이터 허가 철회가 가능합니다.\n\n문의: support@lock-app.com' },
      { title: '아동 개인정보', body: 'Lock은 13세 미만 아동을 대상으로 하지 않습니다.' },
      { title: '정책 업데이트', body: '중요한 변경사항은 앱 내 알림 또는 이메일로 안내드립니다.' },
    ],
  },
};

// ── Terms of Service ─────────────────────────────────────────────────────────

const termsContent: Record<LanguageCode, LegalContent> = {
  'zh-CN': {
    intro: '通过下载、安装或使用 Lock 应用，您同意受本服务条款约束。',
    lastUpdated: '最后更新：2026 年 1 月 1 日',
    sections: [
      { title: '服务描述', body: 'Lock 提供：\n\n• AI 食物识别与卡路里追踪\n• 健康数据监测（步数、消耗热量）\n• 社交功能（好友、排行榜、挑战赛）\n• 个性化饮食分析\n\nLock 提供的内容仅供参考，不构成医疗建议。' },
      { title: '账户注册', body: '• 您必须年满 13 周岁\n• 您有责任保管账户凭据\n• 请勿与他人共享账户\n• 如发现未授权访问，请立即联系我们' },
      { title: '订阅与付款', body: '免费版：每日 3 次 AI 识别，最多 5 位好友\n\nPro 版：无限 AI 识别、AI 饮食分析、无限好友、创建挑战赛、数据导出\n\n• 费用通过 App Store 或 Google Play 收取\n• 订阅将在当前周期结束前 24 小时自动续费\n• 可随时在 App Store / Google Play 取消\n• 已付费期间不予退款' },
      { title: '用户行为准则', body: '使用 Lock 时，您同意不得：\n\n• 发布虚假或有害内容\n• 骚扰或伤害其他用户\n• 尝试未经授权访问系统\n• 使用自动化工具访问服务\n• 违反任何适用法律' },
      { title: '健康免责声明', body: 'Lock 提供的卡路里估算和饮食建议仅供参考，不构成专业医疗建议。\n\n• AI 识别的食物数据可能存在误差\n• 开始新的饮食或锻炼计划前请咨询专业医生\n• 我们对因依赖应用数据而产生的健康问题不承担责任' },
      { title: '知识产权', body: 'Lock 中的所有内容均为 Lock 团队的财产，受知识产权法保护。未经书面许可，不得复制或分发。' },
      { title: '责任限制', body: '在法律允许的最大范围内，Lock 对以下情况不承担责任：\n\n• 因使用或无法使用服务造成的损失\n• 数据丢失或损坏\n• 第三方行为造成的损害\n\n我们的最大责任不超过您过去 12 个月内支付的订阅费用。' },
      { title: '联系我们', body: '如有疑问，请联系：\n\nsupport@lock-app.com' },
    ],
  },
  'en-US': {
    intro: 'By downloading, installing, or using Lock, you agree to be bound by these Terms of Service.',
    lastUpdated: 'Last updated: January 1, 2026',
    sections: [
      { title: 'Service Description', body: 'Lock provides:\n\n• AI food recognition and calorie tracking\n• Health data monitoring (steps, active calories)\n• Social features (friends, leaderboards, challenges)\n• Personalized diet analysis\n\nContent provided by Lock is for informational purposes only and does not constitute medical advice.' },
      { title: 'Account Registration', body: '• You must be at least 13 years old\n• You are responsible for keeping your credentials secure\n• Do not share your account with others\n• Report unauthorized access immediately' },
      { title: 'Subscriptions & Payments', body: 'Free tier: 3 AI scans/day, up to 5 friends\n\nPro: Unlimited AI scans, AI diet analysis, unlimited friends, create challenges, data export\n\n• Fees are charged through App Store or Google Play\n• Subscriptions auto-renew 24 hours before the current period ends\n• Cancel anytime in App Store / Google Play\n• No refunds for the current paid period' },
      { title: 'User Conduct', body: 'You agree not to:\n\n• Post false or harmful content\n• Harass or harm other users\n• Attempt unauthorized access\n• Use automated tools to access the service\n• Violate any applicable laws' },
      { title: 'Health Disclaimer', body: 'Calorie estimates and diet suggestions from Lock are for reference only and do not constitute professional medical advice.\n\n• AI-recognized food data may contain errors\n• Consult a doctor before starting new diet or exercise plans\n• We are not liable for health issues arising from reliance on app data' },
      { title: 'Intellectual Property', body: 'All content in Lock is the property of the Lock team and protected by intellectual property laws. Reproduction or distribution without written permission is prohibited.' },
      { title: 'Limitation of Liability', body: 'To the maximum extent permitted by law, Lock is not liable for:\n\n• Losses from use or inability to use the service\n• Data loss or corruption\n• Damages caused by third parties\n\nOur maximum liability shall not exceed subscription fees paid in the past 12 months.' },
      { title: 'Contact', body: 'For questions, contact us at:\n\nsupport@lock-app.com' },
    ],
  },
  'zh-TW': {
    intro: '通過下載、安裝或使用 Lock 應用，您同意受本服務條款約束。',
    lastUpdated: '最後更新：2026 年 1 月 1 日',
    sections: [
      { title: '服務說明', body: 'Lock 提供：\n\n• AI 食物識別與卡路里追蹤\n• 健康數據監測（步數、消耗熱量）\n• 社交功能（好友、排行榜、挑戰賽）\n• 個性化飲食分析\n\nLock 提供的內容僅供參考，不構成醫療建議。' },
      { title: '賬戶注冊', body: '• 您必須年滿 13 周歲\n• 您有責任保管賬戶憑據\n• 如發現未授權訪問，請立即聯繫我們' },
      { title: '訂閱與付款', body: '免費版：每日 3 次 AI 識別，最多 5 位好友\n\nPro 版：無限 AI 識別、AI 飲食分析、無限好友\n\n• 費用通過 App Store 或 Google Play 收取\n• 可隨時取消，已付費期間不予退款' },
      { title: '用戶行為準則', body: '您同意不發布虛假或有害內容，不騷擾其他用戶，不違反任何適用法律。' },
      { title: '健康免責聲明', body: 'Lock 提供的卡路里估算和飲食建議僅供參考，不構成專業醫療建議。開始新的飲食或鍛鍊計劃前請咨詢專業醫生。' },
      { title: '責任限制', body: '在法律允許的範圍內，Lock 不承擔因使用服務造成的損失責任。' },
      { title: '聯繫我們', body: 'support@lock-app.com' },
    ],
  },
  'ja-JP': {
    intro: 'Lockをダウンロード、インストール、または使用することで、本利用規約に同意したものとみなされます。',
    lastUpdated: '最終更新：2026年1月1日',
    sections: [
      { title: 'サービスの説明', body: 'Lockは以下を提供します：\n\n• AI食品認識とカロリー追跡\n• 健康データモニタリング（歩数、活動カロリー）\n• ソーシャル機能（友達、ランキング、チャレンジ）\n• パーソナライズされた食事分析\n\n提供されるコンテンツは情報提供のみを目的としており、医療アドバイスを構成するものではありません。' },
      { title: 'アカウント登録', body: '• 13歳以上である必要があります\n• ログイン情報を安全に管理する責任があります\n• 不正アクセスを発見した場合はすぐにご連絡ください' },
      { title: 'サブスクリプションと支払い', body: '無料プラン：1日3回のAIスキャン、最大5人の友達\n\nProプラン：無制限のAIスキャン、AI食事分析、無制限の友達\n\n• 料金はApp StoreまたはGoogle Playで請求\n• いつでもキャンセル可能、支払済み期間の返金なし' },
      { title: '健康に関する免責事項', body: 'Lockのカロリー推定と食事アドバイスは参考情報のみで、医療アドバイスを構成するものではありません。新しい食事や運動プログラムを始める前に医師にご相談ください。' },
      { title: '責任の制限', body: '法律で許可される最大限の範囲で、Lockはサービスの使用による損失について責任を負いません。' },
      { title: 'お問い合わせ', body: 'support@lock-app.com' },
    ],
  },
  'ko-KR': {
    intro: 'Lock을 다운로드, 설치 또는 사용함으로써 본 이용약관에 동의하는 것으로 간주됩니다.',
    lastUpdated: '최종 업데이트: 2026년 1월 1일',
    sections: [
      { title: '서비스 설명', body: 'Lock은 다음을 제공합니다:\n\n• AI 음식 인식 및 칼로리 추적\n• 건강 데이터 모니터링 (걸음수, 활동 칼로리)\n• 소셜 기능 (친구, 순위, 챌린지)\n• 개인화된 식단 분석\n\nLock이 제공하는 콘텐츠는 정보 제공 목적이며 의학적 조언을 구성하지 않습니다.' },
      { title: '계정 등록', body: '• 만 13세 이상이어야 합니다\n• 계정 자격증명을 안전하게 관리할 책임이 있습니다\n• 무단 접근 발견 시 즉시 연락하세요' },
      { title: '구독 및 결제', body: '무료: 하루 3회 AI 스캔, 최대 5명 친구\n\nPro: 무제한 AI 스캔, AI 식단 분석, 무제한 친구\n\n• 요금은 App Store 또는 Google Play에서 청구\n• 언제든지 취소 가능, 결제 기간 환불 불가' },
      { title: '건강 면책 조항', body: 'Lock의 칼로리 추정 및 식단 제안은 참고용이며 전문 의료 조언을 구성하지 않습니다. 새로운 식단이나 운동 계획을 시작하기 전에 의사와 상담하세요.' },
      { title: '책임 제한', body: '법률이 허용하는 최대 범위 내에서 Lock은 서비스 사용으로 인한 손실에 대해 책임을 지지 않습니다.' },
      { title: '문의', body: 'support@lock-app.com' },
    ],
  },
};

export function getPrivacyContent(lang: LanguageCode): LegalContent {
  return privacyContent[lang] ?? privacyContent['en-US'];
}

export function getTermsContent(lang: LanguageCode): LegalContent {
  return termsContent[lang] ?? termsContent['en-US'];
}
