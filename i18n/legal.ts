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

/*
 * Keep these in step with the website (website/app/privacy, website/app/terms):
 * App Review reads both. The English text is the reference; the others are
 * translations of it.
 */

// ── Privacy Policy ───────────────────────────────────────────────────────────

const privacyContent: Record<LanguageCode, LegalContent> = {
  'en-US': {
    intro: 'Lock ("we", "our", "us") values your privacy. This policy explains what we collect, how we use it, and the choices you have when you use the Lock app.',
    lastUpdated: 'Last updated: November 8, 2026',
    sections: [
      { title: 'Information We Collect', body: `• Account information: your email address, name, username, bio and profile picture, and the body details you enter during setup (height, weight, age, gender, goal, exercise frequency)
• Meal data: the meals you log (food names, calories and macros). Photos you take for calorie analysis, and meals you describe in words, are sent to our AI provider, Fireworks AI, to estimate their calories and macros. When you save a meal, a small thumbnail of its photo is kept in private storage so it can show in your log. Only you can see it, and deleting the meal deletes it
• Buddy and social data: the names you give your coach and buddy, its growth (from workouts, steps and logged meals), the pats you and your friends send, and your friends list
• Couple space: if you link with a friend as a couple, the link itself (who invited whom and when it was accepted), the "together since" date and anniversaries you add, the nudges you send each other, your shared growth points and the furniture you buy for your shared home
• Health data: with your permission, steps and active energy from Apple Health, and, if you use the Apple Watch app, heart rate during a workout (see "Apple Health" below)
• Training data: your weekly workout plan and the workouts you log (exercises, sets, reps, weights and duration)
• Water: the drinks you log (type and amount), stored with your account so your history and your couple space stay in sync
• Weight records you choose to log, your unit preference (kg or lb), and a push notification token if you turn on reminders
• Purchases: your subscription status (Free or Pro). Payments are processed by Apple; we never see your payment details` },
      { title: 'How We Use Your Information', body: `• Provide Lock's core features: AI food recognition, calorie and macro tracking, workout planning and logging, and diet and training analysis
• Calculate your daily calorie goals and show your progress
• Run social features (friends, leaderboards and buddies), including telling a friend when you pat their buddy
• Run the couple space: showing your partner your day, and sending the nudges you choose to send as push notifications
• Send meal reminders and friend notifications you opt in to
• Verify and manage your subscription
• Keep the service secure and enforce our Terms of Service` },
      { title: 'Apple Health', body: `Lock reads your steps and active energy from Apple HealthKit, only after you grant permission, to show your daily activity in the app and to grow your buddy.

If you use Lock on Apple Watch, the watch app reads your heart rate and active energy during a workout to show them on the watch, and saves the finished strength workout to Apple Health. Heart rate stays on your devices; it is not sent to Lock's servers.

• HealthKit data is used only for health and fitness features inside Lock
• It is never used for advertising or marketing
• It is never sold, and never shared with advertising platforms or data brokers
• You can revoke access at any time in the Health app: tap your profile → Apps → Lock` },
      { title: 'Service Providers', body: `We do not sell your personal data. We share data only with providers that run the service for us:

• Clerk: sign-in and account security (including Sign in with Apple / Google)
• Fireworks AI: analysing meal photos, nutrition labels and meals you describe in words, writing the AI review and AI workout plan from your recent meals, workouts and goals, and translating food names into one language. It receives only what each request needs, not your name or email
• Supabase: database and private photo storage
• Vercel: server hosting
• RevenueCat: subscription management
• Expo: delivering push notifications
• USDA FoodData Central: food search (only the search text is sent, never your personal data)` },
      { title: 'What Your Friends Can See', body: "Social features are friends-only. Your friends can see your display name, username, avatar, status, today's calorie total, streak and your buddy (its name, kind and stage). Your meals, meal photos, workouts and weight are not shared with friends. You can remove friends and block users; blocked users can no longer see you, find you in search or send you friend requests." },
      { title: 'What Your Partner Can See', body: `The couple space is opt-in. Only a friend can invite you, and nothing is shared until you accept. While you are linked, your partner can see your name and avatar and today's totals against your goals: calories, protein, water, steps and whether you trained. They also see the nudges you send, your shared anniversaries, growth points and home.

Your partner does not see your individual meals, meal photos, the details of your workouts or your weight. Either of you can unlink at any time in the couple space; after that, neither of you can see the other's day.` },
      { title: 'Data Retention & Deletion', body: `Your data is kept while your account is active. You can delete your account at any time in Settings → Account & Security → Delete Account. This immediately and permanently deletes your account and all its data (meals, meal photos, workouts, water, weight and health records, your buddy, friends and couple space), and, if you signed in with Apple, revokes Lock's Sign in with Apple access.

Deleting your account does not cancel an App Store subscription; cancel it in your Apple ID settings. You can export your meal history from Settings at any time.

To stop the free first week of Pro being claimed again with the same email, after you delete your account we keep a one-way hash of your email address and the date it first signed up. It cannot be turned back into your email.` },
      { title: 'Your Rights', body: 'You can access, correct, export or delete your personal data, and withdraw permissions such as Apple Health or notifications at any time. Contact support@jkeroro.com for any request.' },
      { title: 'Security', body: 'Data is encrypted in transit and stored with industry-standard providers. Passwords are handled by Clerk; Lock never has access to your password.' },
      { title: "Children's Privacy", body: 'Lock is for adults 18 and older. It is not directed at children, and we do not knowingly collect personal information from anyone under 18. If you believe someone under 18 has given us data, contact us and we will delete it.' },
      { title: 'Changes to This Policy', body: 'We will tell you about significant changes in the app or by email. Continued use of Lock after changes means you accept the updated policy.' },
      { title: 'Contact', body: 'Questions? Email support@jkeroro.com' },
    ],
  },
  'zh-CN': {
    intro: 'Lock（以下简称"我们"）重视您的隐私。本政策说明您使用 Lock 时，我们收集哪些信息、如何使用，以及您可以做哪些选择。',
    lastUpdated: '最后更新：2026 年 11 月 8 日',
    sections: [
      { title: '我们收集的信息', body: `• 账号信息：邮箱、姓名、用户名、简介和头像，以及注册时填写的身体信息（身高、体重、年龄、性别、目标、运动频率）
• 饮食记录：您记录的餐食（食物名称、热量和营养素）。用于识别热量的餐食照片，以及您用文字描述的餐食，会发送给我们的 AI 服务商 Fireworks AI 估算热量和营养素。保存餐食时，照片的小缩略图会存放在私有存储中，以便在记录里显示。只有您自己能看到，删除该餐食即同时删除缩略图
• 伙伴和社交数据：您给教练和伙伴起的名字、伙伴的成长（来自训练、步数和记录的餐食）、您和好友互相拍拍的记录，以及您的好友列表
• 情侣空间：如果您和一位好友绑定情侣，我们会保存绑定关系本身（谁发出邀请、何时同意）、您设置的"在一起"日期和纪念日、你们互发的提醒、共同的成长值，以及为小家购买的家具
• 健康数据：经您授权后，从 Apple 健康读取的步数和活动能量；如果您使用 Apple Watch App，还包括训练过程中的心率（见下方"Apple 健康"）
• 训练数据：您的每周训练计划和训练记录（动作、组数、次数、重量和时长）
• 饮水：您记录的饮品（种类和量），随账号保存，以便历史记录和情侣空间保持同步
• 您主动记录的体重、单位偏好（kg 或 lb），以及开启提醒时的推送通知令牌
• 购买信息：您的订阅状态（免费版或 Pro）。付款由 Apple 处理，我们看不到您的支付信息` },
      { title: '我们如何使用您的信息', body: `• 提供 Lock 的核心功能：AI 食物识别、热量和营养素追踪、训练计划与记录，以及饮食和训练分析
• 计算每日热量目标并显示您的进度
• 运行社交功能（好友、排行榜和伙伴），包括在您拍拍好友的伙伴时通知对方
• 运行情侣空间：向另一半显示您的今天，并把您选择发送的提醒作为推送通知发出
• 发送您开启的餐食提醒和好友通知
• 验证和管理您的订阅
• 保障服务安全，执行服务条款` },
      { title: 'Apple 健康', body: `只有在您授权后，Lock 才会通过 Apple HealthKit 读取您的步数和活动能量，用于在 App 中显示每日活动并让伙伴成长。

如果您在 Apple Watch 上使用 Lock，手表 App 会在训练时读取心率和活动能量并显示在手表上，训练结束后把力量训练保存到 Apple 健康。心率只留在您的设备上，不会发送到 Lock 的服务器。

• HealthKit 数据只用于 Lock 内的健康和健身功能
• 绝不用于广告或营销
• 绝不出售，也绝不与广告平台或数据经纪商共享
• 您可以随时在"健康" App 中撤回授权：点头像 → App → Lock` },
      { title: '服务提供商', body: `我们不会出售您的个人数据，只与代我们运行服务的提供商共享必要数据：

• Clerk：登录和账号安全（包括通过 Apple / Google 登录）
• Fireworks AI：识别餐食照片、营养标签和文字描述的餐食，根据您最近的饮食、训练和目标生成 AI 分析和 AI 训练计划，以及把食物名称翻译成同一种语言。它只收到完成每个请求所需的内容，不含您的姓名和邮箱
• Supabase：数据库和私有照片存储
• Vercel：服务器托管
• RevenueCat：订阅管理
• Expo：推送通知
• USDA FoodData Central：食物搜索（只发送搜索词，从不发送您的个人数据）` },
      { title: '好友能看到什么', body: '社交功能仅对好友开放。好友可以看到您的昵称、用户名、头像、状态、今日热量、连续打卡天数，以及您的伙伴（名字、种类和阶段）。您的餐食、餐食照片、训练和体重不会分享给好友。您可以删除好友或拉黑用户；被拉黑的用户将无法看到您、搜索到您或向您发送好友请求。' },
      { title: '另一半能看到什么', body: `情侣空间需要您主动加入。只有好友能邀请您，您同意之前不会共享任何内容。绑定期间，另一半可以看到您的名字和头像，以及今天相对目标的进度：热量、蛋白质、饮水、步数和是否训练。对方还能看到您发出的提醒、你们共同的纪念日、成长值和小家。

另一半看不到您的具体餐食、餐食照片、训练细节或体重。任何一方都可以随时在情侣空间解除绑定，解除后双方都看不到对方的今天。` },
      { title: '数据保存与删除', body: `账号有效期间，我们会保存您的数据。您可以随时在 设置 → 账号与安全 → 删除账号 中删除账号。这会立即永久删除您的账号及全部数据（餐食、餐食照片、训练、饮水、体重和健康记录、伙伴、好友和情侣空间）；如果您用 Apple 登录，还会撤销 Lock 的"通过 Apple 登录"授权。

删除账号不会取消 App Store 订阅，请在 Apple ID 设置中取消。您可以随时在设置中导出饮食记录。

为防止同一邮箱重复领取首周免费 Pro，删除账号后我们会保留您邮箱的单向哈希值和首次注册日期，它无法还原成邮箱。` },
      { title: '您的权利', body: '您可以随时访问、更正、导出或删除您的个人数据，并撤回 Apple 健康或通知等授权。如有任何请求，请联系 support@jkeroro.com。' },
      { title: '安全', body: '数据在传输中加密，并存储在符合行业标准的服务商处。密码由 Clerk 处理，Lock 无法获取您的密码。' },
      { title: '未成年人隐私', body: 'Lock 面向 18 岁及以上的成年人，不面向未成年人，我们也不会有意收集 18 岁以下用户的个人信息。如果您认为有未满 18 岁的人向我们提供了数据，请联系我们，我们会将其删除。' },
      { title: '政策更新', body: '重大变更时，我们会在 App 内或通过邮件告知您。变更后继续使用 Lock 即表示您接受更新后的政策。' },
      { title: '联系我们', body: '如有疑问，请发邮件至 support@jkeroro.com' },
    ],
  },
  'zh-TW': {
    intro: 'Lock（以下簡稱「我們」）重視您的隱私。本政策說明您使用 Lock 時，我們收集哪些資訊、如何使用，以及您可以做哪些選擇。',
    lastUpdated: '最後更新：2026 年 11 月 8 日',
    sections: [
      { title: '我們收集的資訊', body: `• 帳號資訊：電子郵件、姓名、使用者名稱、簡介和頭像，以及註冊時填寫的身體資訊（身高、體重、年齡、性別、目標、運動頻率）
• 飲食紀錄：您記錄的餐點（食物名稱、熱量和營養素）。用於辨識熱量的餐點照片，以及您用文字描述的餐點，會傳送給我們的 AI 服務商 Fireworks AI 估算熱量和營養素。儲存餐點時，照片的小縮圖會存放在私有儲存空間，以便在紀錄中顯示。只有您自己看得到，刪除該餐點即同時刪除縮圖
• 夥伴和社交資料：您為教練和夥伴取的名字、夥伴的成長（來自訓練、步數和記錄的餐點）、您和好友互相拍拍的紀錄，以及您的好友列表
• 情侶空間：如果您和一位好友綁定情侶，我們會保存綁定關係本身（誰發出邀請、何時同意）、您設定的「在一起」日期和紀念日、你們互傳的提醒、共同的成長值，以及為小家購買的家具
• 健康資料：經您授權後，從 Apple 健康讀取的步數和活動能量；如果您使用 Apple Watch App，還包括訓練過程中的心率（見下方「Apple 健康」）
• 訓練資料：您的每週訓練計畫和訓練紀錄（動作、組數、次數、重量和時長）
• 飲水：您記錄的飲品（種類和量），隨帳號保存，讓歷史紀錄和情侶空間保持同步
• 您主動記錄的體重、單位偏好（kg 或 lb），以及開啟提醒時的推播通知權杖
• 購買資訊：您的訂閱狀態（免費版或 Pro）。付款由 Apple 處理，我們看不到您的付款資訊` },
      { title: '我們如何使用您的資訊', body: `• 提供 Lock 的核心功能：AI 食物辨識、熱量和營養素追蹤、訓練計畫與紀錄，以及飲食和訓練分析
• 計算每日熱量目標並顯示您的進度
• 運作社交功能（好友、排行榜和夥伴），包括在您拍拍好友的夥伴時通知對方
• 運作情侶空間：向另一半顯示您的今天，並把您選擇傳送的提醒作為推播通知發出
• 傳送您開啟的餐點提醒和好友通知
• 驗證和管理您的訂閱
• 維護服務安全，執行服務條款` },
      { title: 'Apple 健康', body: `只有在您授權後，Lock 才會透過 Apple HealthKit 讀取您的步數和活動能量，用於在 App 中顯示每日活動並讓夥伴成長。

如果您在 Apple Watch 上使用 Lock，手錶 App 會在訓練時讀取心率和活動能量並顯示在手錶上，訓練結束後把重量訓練儲存到 Apple 健康。心率只留在您的裝置上，不會傳送到 Lock 的伺服器。

• HealthKit 資料只用於 Lock 內的健康和健身功能
• 絕不用於廣告或行銷
• 絕不出售，也絕不與廣告平台或資料仲介共享
• 您可以隨時在「健康」App 中撤回授權：點頭像 → App → Lock` },
      { title: '服務供應商', body: `我們不會出售您的個人資料，只與代我們運作服務的供應商共享必要資料：

• Clerk：登入和帳號安全（包括透過 Apple / Google 登入）
• Fireworks AI：辨識餐點照片、營養標示和文字描述的餐點，根據您最近的飲食、訓練和目標產生 AI 分析和 AI 訓練計畫，以及把食物名稱翻譯成同一種語言。它只收到完成每個請求所需的內容，不含您的姓名和電子郵件
• Supabase：資料庫和私有照片儲存
• Vercel：伺服器代管
• RevenueCat：訂閱管理
• Expo：推播通知
• USDA FoodData Central：食物搜尋（只傳送搜尋文字，從不傳送您的個人資料）` },
      { title: '好友能看到什麼', body: '社交功能僅對好友開放。好友可以看到您的暱稱、使用者名稱、頭像、狀態、今日熱量、連續打卡天數，以及您的夥伴（名字、種類和階段）。您的餐點、餐點照片、訓練和體重不會分享給好友。您可以刪除好友或封鎖使用者；被封鎖的使用者將無法看到您、搜尋到您或向您傳送好友邀請。' },
      { title: '另一半能看到什麼', body: `情侶空間需要您主動加入。只有好友能邀請您，您同意之前不會共享任何內容。綁定期間，另一半可以看到您的名字和頭像，以及今天相對目標的進度：熱量、蛋白質、飲水、步數和是否訓練。對方也能看到您傳送的提醒、你們共同的紀念日、成長值和小家。

另一半看不到您的具體餐點、餐點照片、訓練細節或體重。任何一方都可以隨時在情侶空間解除綁定，解除後雙方都看不到對方的今天。` },
      { title: '資料保存與刪除', body: `帳號有效期間，我們會保存您的資料。您可以隨時在 設定 → 帳號與安全 → 刪除帳號 中刪除帳號。這會立即永久刪除您的帳號及全部資料（餐點、餐點照片、訓練、飲水、體重和健康紀錄、夥伴、好友和情侶空間）；如果您用 Apple 登入，還會撤銷 Lock 的「使用 Apple 登入」授權。

刪除帳號不會取消 App Store 訂閱，請在 Apple ID 設定中取消。您可以隨時在設定中匯出飲食紀錄。

為防止同一電子郵件重複領取首週免費 Pro，刪除帳號後我們會保留您電子郵件的單向雜湊值和首次註冊日期，它無法還原成電子郵件。` },
      { title: '您的權利', body: '您可以隨時存取、更正、匯出或刪除您的個人資料，並撤回 Apple 健康或通知等授權。如有任何請求，請聯絡 support@jkeroro.com。' },
      { title: '安全', body: '資料在傳輸中加密，並存放在符合業界標準的服務商。密碼由 Clerk 處理，Lock 無法取得您的密碼。' },
      { title: '未成年人隱私', body: 'Lock 適用於 18 歲以上的成年人，不以未成年人為對象，我們也不會有意收集未滿 18 歲使用者的個人資訊。如果您認為有未滿 18 歲的人向我們提供了資料，請聯絡我們，我們會將其刪除。' },
      { title: '政策更新', body: '重大變更時，我們會在 App 內或透過電子郵件通知您。變更後繼續使用 Lock 即表示您接受更新後的政策。' },
      { title: '聯絡我們', body: '如有疑問，請寄信至 support@jkeroro.com' },
    ],
  },
  'ja-JP': {
    intro: 'Lock（以下「当社」）はお客様のプライバシーを大切にしています。本ポリシーでは、Lock の利用時に当社が収集する情報、その利用方法、お客様が選べることについて説明します。',
    lastUpdated: '最終更新：2026年11月8日',
    sections: [
      { title: '収集する情報', body: `• アカウント情報：メールアドレス、名前、ユーザー名、自己紹介、プロフィール写真、登録時に入力した身体情報（身長、体重、年齢、性別、目標、運動頻度）
• 食事データ：記録した食事（食品名、カロリー、栄養素）。カロリー分析のために撮影した写真や、文章で入力した食事は、AI プロバイダーの Fireworks AI に送信され、カロリーと栄養素を推定します。食事を保存すると、記録に表示するため写真の小さなサムネイルが非公開ストレージに保存されます。見られるのはお客様だけで、食事を削除するとサムネイルも削除されます
• バディとソーシャルデータ：コーチとバディに付けた名前、バディの成長（トレーニング、歩数、記録した食事による）、お客様と友達が送ったなでなで、友達リスト
• カップルスペース：友達とカップルとしてリンクした場合、リンク自体（誰が招待し、いつ承認されたか）、設定した「付き合った日」と記念日、お互いに送ったリマインド、共有の成長ポイント、ふたりの部屋のために購入した家具
• 健康データ：許可をいただいた場合、Apple ヘルスケアの歩数とアクティブエネルギー。Apple Watch アプリを使う場合は、トレーニング中の心拍数（下記「Apple ヘルスケア」参照）
• トレーニングデータ：週間トレーニングプランと記録したトレーニング（種目、セット数、回数、重量、時間）
• 水分：記録した飲み物（種類と量）。履歴とカップルスペースを同期させるため、アカウントと一緒に保存します
• 任意で記録した体重、単位設定（kg または lb）、リマインダーをオンにした場合のプッシュ通知トークン
• 購入：サブスクリプションの状態（無料または Pro）。支払いは Apple が処理し、当社は支払い情報を見ることはありません` },
      { title: '情報の利用方法', body: `• Lock の主要機能の提供：AI 食品認識、カロリーと栄養素の記録、トレーニングプランと記録、食事とトレーニングの分析
• 1日のカロリー目標の計算と進捗の表示
• ソーシャル機能（友達、ランキング、バディ）の運営。友達のバディをなでたときの通知を含みます
• カップルスペースの運営：パートナーにお客様の今日を表示し、お客様が選んで送るリマインドをプッシュ通知で届けます
• オンにした食事リマインダーと友達の通知の送信
• サブスクリプションの確認と管理
• サービスの安全確保と利用規約の執行` },
      { title: 'Apple ヘルスケア', body: `Lock は、許可をいただいた後にのみ Apple HealthKit から歩数とアクティブエネルギーを読み取り、アプリ内で毎日の活動を表示し、バディを育てるために使います。

Apple Watch で Lock を使う場合、ウォッチアプリはトレーニング中に心拍数とアクティブエネルギーを読み取ってウォッチに表示し、終了した筋トレを Apple ヘルスケアに保存します。心拍数はお客様のデバイスにとどまり、Lock のサーバーには送信されません。

• HealthKit データは Lock 内の健康とフィットネスの機能にのみ使用します
• 広告やマーケティングには一切使用しません
• 販売せず、広告プラットフォームやデータブローカーと共有することもありません
• ヘルスケアアプリでいつでもアクセスを取り消せます：プロフィール → アプリ → Lock` },
      { title: 'サービスプロバイダー', body: `当社はお客様の個人データを販売しません。当社に代わってサービスを運営するプロバイダーとのみ共有します：

• Clerk：サインインとアカウントのセキュリティ（Apple / Google でサインインを含む）
• Fireworks AI：食事の写真、栄養成分表示、文章で入力した食事の分析、最近の食事・トレーニング・目標にもとづく AI レビューと AI トレーニングプランの作成、食品名の1つの言語への翻訳。各リクエストに必要な内容のみを受け取り、名前やメールアドレスは含みません
• Supabase：データベースと非公開の写真ストレージ
• Vercel：サーバーホスティング
• RevenueCat：サブスクリプション管理
• Expo：プッシュ通知の配信
• USDA FoodData Central：食品検索（検索語のみを送信し、個人データは送信しません）` },
      { title: '友達に見えるもの', body: 'ソーシャル機能は友達限定です。友達に見えるのは、表示名、ユーザー名、アバター、ステータス、今日のカロリー合計、連続記録、バディ（名前、種類、成長段階）です。食事、食事の写真、トレーニング、体重は友達と共有されません。友達の削除やユーザーのブロックができ、ブロックしたユーザーはお客様を見ること、検索すること、友達リクエストを送ることができなくなります。' },
      { title: 'パートナーに見えるもの', body: `カップルスペースへの参加は任意です。招待できるのは友達だけで、お客様が承認するまで何も共有されません。リンク中、パートナーにはお客様の名前とアバター、目標に対する今日の合計（カロリー、たんぱく質、水分、歩数、トレーニングしたかどうか）が表示されます。お客様が送ったリマインド、ふたりの記念日、成長ポイント、部屋も表示されます。

個々の食事、食事の写真、トレーニングの詳細、体重はパートナーに表示されません。どちらからでもカップルスペースでいつでもリンクを解除でき、解除後はお互いの今日は見えなくなります。` },
      { title: 'データの保存と削除', body: `データはアカウントが有効な間保存されます。設定 → アカウントとセキュリティ → アカウントを削除 から、いつでもアカウントを削除できます。アカウントとそのすべてのデータ（食事、食事の写真、トレーニング、水分、体重と健康の記録、バディ、友達、カップルスペース）が直ちに完全に削除され、Apple でサインインしていた場合は Lock の「Apple でサインイン」のアクセスも取り消されます。

アカウントを削除しても App Store のサブスクリプションは解約されません。Apple ID の設定で解約してください。食事の履歴は設定からいつでもエクスポートできます。

同じメールアドレスで最初の1週間の無料 Pro が再度利用されないよう、アカウント削除後もメールアドレスの一方向ハッシュと最初の登録日を保持します。これをメールアドレスに戻すことはできません。` },
      { title: 'お客様の権利', body: '個人データへのアクセス、訂正、エクスポート、削除、および Apple ヘルスケアや通知などの許可の取り消しはいつでも可能です。ご依頼は support@jkeroro.com までご連絡ください。' },
      { title: 'セキュリティ', body: 'データは通信時に暗号化され、業界標準のプロバイダーに保存されます。パスワードは Clerk が管理し、Lock がパスワードにアクセスすることはありません。' },
      { title: '未成年者のプライバシー', body: 'Lock は18歳以上の成人向けです。未成年者を対象としておらず、18歳未満の方の個人情報を故意に収集することはありません。18歳未満の方がデータを提供したと思われる場合はご連絡ください。削除いたします。' },
      { title: '本ポリシーの変更', body: '重要な変更がある場合は、アプリ内またはメールでお知らせします。変更後も Lock を使い続けることで、更新後のポリシーに同意したものとみなされます。' },
      { title: 'お問い合わせ', body: 'ご質問は support@jkeroro.com までメールでお送りください' },
    ],
  },
  'ko-KR': {
    intro: 'Lock(이하 "당사")은 회원님의 개인정보를 소중히 여깁니다. 본 방침은 Lock을 사용할 때 당사가 수집하는 정보, 이용 방법, 회원님이 선택할 수 있는 사항을 설명합니다.',
    lastUpdated: '최종 업데이트: 2026년 11월 8일',
    sections: [
      { title: '수집하는 정보', body: `• 계정 정보: 이메일 주소, 이름, 사용자 이름, 소개, 프로필 사진, 가입 시 입력한 신체 정보(키, 체중, 나이, 성별, 목표, 운동 빈도)
• 식단 데이터: 기록한 식사(음식 이름, 칼로리, 영양소). 칼로리 분석을 위해 찍은 사진과 글로 설명한 식사는 AI 제공업체 Fireworks AI로 전송되어 칼로리와 영양소를 추정합니다. 식사를 저장하면 기록에 표시하기 위해 사진의 작은 썸네일이 비공개 저장소에 보관됩니다. 회원님만 볼 수 있으며, 식사를 삭제하면 썸네일도 삭제됩니다
• 버디 및 소셜 데이터: 코치와 버디에게 지어 준 이름, 버디의 성장(운동, 걸음수, 기록한 식사로부터), 회원님과 친구가 보낸 쓰다듬기, 친구 목록
• 커플 공간: 친구와 커플로 연결한 경우 연결 자체(누가 초대했고 언제 수락했는지), 설정한 "함께한 날"과 기념일, 서로 보낸 알림, 공동 성장 포인트, 함께 사는 집을 위해 구매한 가구
• 건강 데이터: 허용한 경우 Apple 건강의 걸음수와 활동 에너지, Apple Watch 앱을 사용하면 운동 중 심박수(아래 "Apple 건강" 참조)
• 운동 데이터: 주간 운동 계획과 기록한 운동(종목, 세트, 횟수, 무게, 시간)
• 물: 기록한 음료(종류와 양). 기록과 커플 공간이 동기화되도록 계정과 함께 저장됩니다
• 직접 기록한 체중, 단위 설정(kg 또는 lb), 알림을 켠 경우 푸시 알림 토큰
• 구매: 구독 상태(무료 또는 Pro). 결제는 Apple이 처리하며 당사는 결제 정보를 볼 수 없습니다` },
      { title: '정보 이용 방법', body: `• Lock의 핵심 기능 제공: AI 음식 인식, 칼로리 및 영양소 기록, 운동 계획과 기록, 식단 및 운동 분석
• 하루 칼로리 목표 계산 및 진행 상황 표시
• 소셜 기능(친구, 순위, 버디) 운영. 친구의 버디를 쓰다듬으면 친구에게 알리는 것을 포함합니다
• 커플 공간 운영: 파트너에게 회원님의 오늘을 보여 주고, 회원님이 선택해 보내는 알림을 푸시 알림으로 전송
• 회원님이 켠 식사 알림과 친구 알림 전송
• 구독 확인 및 관리
• 서비스 보안 유지 및 이용약관 집행` },
      { title: 'Apple 건강', body: `Lock은 회원님이 허용한 후에만 Apple HealthKit에서 걸음수와 활동 에너지를 읽어 앱에 하루 활동을 표시하고 버디를 키우는 데 사용합니다.

Apple Watch에서 Lock을 사용하면 워치 앱이 운동 중 심박수와 활동 에너지를 읽어 워치에 표시하고, 끝난 근력 운동을 Apple 건강에 저장합니다. 심박수는 회원님의 기기에만 남으며 Lock 서버로 전송되지 않습니다.

• HealthKit 데이터는 Lock 안의 건강 및 피트니스 기능에만 사용됩니다
• 광고나 마케팅에 절대 사용하지 않습니다
• 판매하지 않으며 광고 플랫폼이나 데이터 브로커와 공유하지 않습니다
• 건강 앱에서 언제든지 접근 권한을 철회할 수 있습니다: 프로필 → 앱 → Lock` },
      { title: '서비스 제공업체', body: `당사는 회원님의 개인정보를 판매하지 않으며, 당사를 대신해 서비스를 운영하는 제공업체와만 공유합니다:

• Clerk: 로그인 및 계정 보안(Apple / Google로 로그인 포함)
• Fireworks AI: 식사 사진, 영양 성분표, 글로 설명한 식사 분석, 최근 식단·운동·목표를 바탕으로 한 AI 리뷰와 AI 운동 계획 작성, 음식 이름을 한 가지 언어로 번역. 각 요청에 필요한 내용만 받으며 이름이나 이메일은 포함되지 않습니다
• Supabase: 데이터베이스 및 비공개 사진 저장소
• Vercel: 서버 호스팅
• RevenueCat: 구독 관리
• Expo: 푸시 알림 전송
• USDA FoodData Central: 음식 검색(검색어만 전송하며 개인정보는 전송하지 않음)` },
      { title: '친구가 볼 수 있는 정보', body: '소셜 기능은 친구에게만 공개됩니다. 친구는 회원님의 표시 이름, 사용자 이름, 아바타, 상태, 오늘의 칼로리 합계, 연속 기록, 버디(이름, 종류, 성장 단계)를 볼 수 있습니다. 식사, 식사 사진, 운동, 체중은 친구와 공유되지 않습니다. 친구를 삭제하거나 사용자를 차단할 수 있으며, 차단된 사용자는 회원님을 보거나 검색하거나 친구 요청을 보낼 수 없습니다.' },
      { title: '파트너가 볼 수 있는 정보', body: `커플 공간은 선택 사항입니다. 친구만 초대할 수 있고, 회원님이 수락하기 전에는 아무것도 공유되지 않습니다. 연결된 동안 파트너는 회원님의 이름과 아바타, 목표 대비 오늘의 합계(칼로리, 단백질, 물, 걸음수, 운동 여부)를 볼 수 있습니다. 회원님이 보낸 알림, 함께하는 기념일, 성장 포인트와 집도 볼 수 있습니다.

파트너는 개별 식사, 식사 사진, 운동 세부 내용, 체중을 볼 수 없습니다. 둘 중 누구든 커플 공간에서 언제든지 연결을 해제할 수 있으며, 해제 후에는 서로의 오늘을 볼 수 없습니다.` },
      { title: '데이터 보관 및 삭제', body: `데이터는 계정이 활성 상태인 동안 보관됩니다. 설정 → 계정 및 보안 → 계정 삭제에서 언제든지 계정을 삭제할 수 있습니다. 계정과 모든 데이터(식사, 식사 사진, 운동, 물, 체중 및 건강 기록, 버디, 친구, 커플 공간)가 즉시 영구 삭제되며, Apple로 로그인한 경우 Lock의 "Apple로 로그인" 접근 권한도 철회됩니다.

계정을 삭제해도 App Store 구독은 해지되지 않습니다. Apple ID 설정에서 해지하세요. 식단 기록은 설정에서 언제든지 내보낼 수 있습니다.

같은 이메일로 첫 주 무료 Pro를 다시 받지 못하도록, 계정 삭제 후에도 이메일 주소의 단방향 해시와 최초 가입일을 보관합니다. 이 값은 이메일로 되돌릴 수 없습니다.` },
      { title: '회원님의 권리', body: '언제든지 개인정보를 열람, 수정, 내보내기 또는 삭제할 수 있으며, Apple 건강이나 알림 같은 권한을 철회할 수 있습니다. 요청은 support@jkeroro.com으로 연락해 주세요.' },
      { title: '보안', body: '데이터는 전송 중 암호화되며 업계 표준 제공업체에 저장됩니다. 비밀번호는 Clerk가 처리하며 Lock은 회원님의 비밀번호에 접근할 수 없습니다.' },
      { title: '미성년자 개인정보', body: 'Lock은 만 18세 이상 성인을 위한 앱입니다. 미성년자를 대상으로 하지 않으며 18세 미만의 개인정보를 고의로 수집하지 않습니다. 18세 미만인 사람이 데이터를 제공했다고 생각되면 연락해 주세요. 삭제하겠습니다.' },
      { title: '방침 변경', body: '중요한 변경 사항은 앱 내 또는 이메일로 알려 드립니다. 변경 후에도 Lock을 계속 사용하면 업데이트된 방침에 동의하는 것으로 간주됩니다.' },
      { title: '문의', body: '궁금한 점은 support@jkeroro.com으로 이메일을 보내 주세요' },
    ],
  },
};

// ── Terms of Service ─────────────────────────────────────────────────────────

const termsContent: Record<LanguageCode, LegalContent> = {
  'en-US': {
    intro: 'By downloading, installing or using Lock, you agree to these Terms of Service.',
    lastUpdated: 'Last updated: November 8, 2026',
    sections: [
      { title: 'Service Description', body: `Lock provides AI food recognition and calorie tracking, workout planning and logging, weight tracking, health data (steps, active energy), social features (friends, leaderboards, buddies), a couple space for two linked friends, an Apple Watch app and Live Activities for workouts, and personalised diet and training analysis.

Content provided by Lock is for information only and is not medical advice.` },
      { title: 'Account Registration', body: `• You must be at least 18 years old
• You are responsible for keeping your credentials secure
• Do not share your account with others
• Report unauthorised access to us immediately` },
      { title: 'Subscriptions & Payments', body: `Free: every new account gets Lock Pro for its first 7 days (no card needed), then 3 AI scans per day; one AI diet review per week; unlimited barcode and manual logging; workout plans and logging; the weight curve, the couple space and data export; unlimited friends.

Lock Pro: unlimited AI scans, unlimited AI diet reviews, and redoing your AI workout plan anytime. Lock Pro is an auto-renewing subscription, offered yearly ($39.99 in the US) or monthly ($7.99 in the US). Prices in other countries are shown in the App Store before you buy.

• The first-week Pro trial is free and ends on its own; nothing is charged unless you subscribe
• Payment is charged to your Apple ID account at confirmation of purchase
• Subscriptions renew automatically unless cancelled at least 24 hours before the end of the current period; your account is charged for renewal within 24 hours before the period ends
• You can manage or cancel your subscription in your App Store account settings
• No refunds are given for the unused part of a paid period, except where required by law or by Apple` },
      { title: 'User Content & Zero Tolerance', body: `You are responsible for your profile information, buddy and coach names, and the anniversaries and other content you add to a couple space. Lock has zero tolerance for objectionable content and abusive users. You agree not to post or send:

• Sexual, nude or sexually suggestive content
• Harassment, bullying, threats or hate speech
• Violence, self-harm, or content promoting disordered eating
• Spam, scams or misleading information
• Content that violates others' privacy or intellectual property
• Anything illegal

You can block a user from the friends leaderboard (and unblock them in Settings), and report abuse to support@jkeroro.com. We review reports within 24 hours, remove violating content, and warn, restrict or permanently ban users who break these rules.` },
      { title: 'Acceptable Use', body: `• Do not try to access the service or other accounts without permission
• Do not use bots, scrapers or other automated tools to access the service
• Do not interfere with or disrupt the service
• Do not break any applicable laws` },
      { title: 'Health Disclaimer', body: `Calorie estimates and diet suggestions from Lock are for reference only and are not professional medical advice.

• AI-recognised food data may contain errors
• Consult a doctor or registered dietitian before starting a new diet or exercise plan
• If you have, or have had, an eating disorder, talk to a professional before tracking calories
• Workout plans, suggested weight increases and calorie burn estimates are general guidance; train within your own limits
• We are not liable for health issues arising from reliance on app data
• The sources behind Lock's calorie, protein, water and step targets are in Settings → Goals → Sources & methods, and at lock.jkeroro.com/sources` },
      { title: 'Intellectual Property', body: 'The Lock app, brand and content (excluding content posted by users) belong to the Lock team and are protected by intellectual property laws. You keep ownership of the content you post and grant us a licence to store and display it to the people you share it with, in order to run the service.' },
      { title: 'Termination', body: 'You may stop using Lock and delete your account at any time. We may suspend or terminate accounts that violate these Terms.' },
      { title: 'Limitation of Liability', body: `To the maximum extent permitted by law, Lock is not liable for losses arising from use of or inability to use the service, data loss or corruption, or damage caused by third parties.

Our maximum liability shall not exceed the subscription fees you paid in the past 12 months.` },
      { title: 'Apple App Store', body: "These Terms are between you and Lock, not Apple. Apple is not responsible for the app or its content. Your use of the app is also subject to Apple's Licensed Application End User License Agreement." },
      { title: 'Contact', body: 'Questions? Email support@jkeroro.com' },
    ],
  },
  'zh-CN': {
    intro: '下载、安装或使用 Lock，即表示您同意本服务条款。',
    lastUpdated: '最后更新：2026 年 11 月 8 日',
    sections: [
      { title: '服务说明', body: `Lock 提供 AI 食物识别与热量追踪、训练计划与记录、体重记录、健康数据（步数、活动能量）、社交功能（好友、排行榜、伙伴）、两位好友绑定的情侣空间、Apple Watch App 和训练实时活动，以及个性化的饮食和训练分析。

Lock 提供的内容仅供参考，不构成医疗建议。` },
      { title: '账号注册', body: `• 您必须年满 18 周岁
• 您有责任保管好账号凭据
• 请勿与他人共用账号
• 如发现未经授权的访问，请立即告诉我们` },
      { title: '订阅与付款', body: `免费版：每个新账号前 7 天免费享受 Lock Pro（无需绑卡），之后每天 3 次 AI 识别；每周 1 次 AI 饮食分析；条码和手动记录不限次数；训练计划与记录；体重曲线、情侣空间和数据导出；好友不限。

Lock Pro：无限 AI 识别、无限 AI 饮食分析，以及随时重新生成 AI 训练计划。Lock Pro 为自动续期订阅，提供年付（美国 $39.99）和月付（美国 $7.99）。其他国家和地区的价格在购买前会显示在 App Store 中。

• 首周 Pro 试用免费，到期自动结束；除非您订阅，否则不会扣费
• 确认购买时从您的 Apple ID 账户扣款
• 除非在当前周期结束前至少 24 小时取消，订阅将自动续期；续期费用在周期结束前 24 小时内扣除
• 您可以在 App Store 账户设置中管理或取消订阅
• 已付周期中未使用的部分不予退款，法律或 Apple 另有规定的除外` },
      { title: '用户内容与零容忍政策', body: `您需对您的个人资料、给伙伴和教练起的名字，以及在情侣空间中添加的纪念日等内容负责。Lock 对不良内容和恶意用户零容忍。您同意不发布或发送：

• 色情、裸露或性暗示内容
• 骚扰、欺凌、威胁或仇恨言论
• 暴力、自残或宣扬饮食失调的内容
• 垃圾信息、诈骗或误导性信息
• 侵犯他人隐私或知识产权的内容
• 任何违法内容

您可以在好友排行榜中拉黑用户（并在设置中解除），并向 support@jkeroro.com 举报滥用行为。我们会在 24 小时内处理举报，删除违规内容，并对违规用户予以警告、限制或永久封禁。` },
      { title: '合理使用', body: `• 不得未经授权访问本服务或他人账号
• 不得使用机器人、爬虫或其他自动化工具访问本服务
• 不得干扰或破坏本服务
• 不得违反任何适用法律` },
      { title: '健康免责声明', body: `Lock 提供的热量估算和饮食建议仅供参考，不构成专业医疗建议。

• AI 识别的食物数据可能有误差
• 开始新的饮食或运动计划前，请咨询医生或注册营养师
• 如果您有或曾有饮食失调，请在记录热量前先咨询专业人士
• 训练计划、加重建议和消耗热量估算均为一般性参考，请在自身能力范围内训练
• 对因依赖 App 数据而产生的健康问题，我们不承担责任
• Lock 热量、蛋白质、饮水和步数目标的参考来源见 设置 → 目标 → 参考来源，以及 lock.jkeroro.com/sources` },
      { title: '知识产权', body: 'Lock App、品牌和内容（用户发布的内容除外）归 Lock 团队所有，受知识产权法保护。您保留所发布内容的所有权，并授权我们为运行服务而存储这些内容并向您分享的对象展示。' },
      { title: '终止', body: '您可以随时停止使用 Lock 并删除账号。对于违反本条款的账号，我们可能暂停或终止其使用。' },
      { title: '责任限制', body: `在法律允许的最大范围内，对于因使用或无法使用本服务、数据丢失或损坏、或第三方造成的损害而产生的损失，Lock 不承担责任。

我们的最高责任不超过您过去 12 个月支付的订阅费用。` },
      { title: 'Apple App Store', body: '本条款是您与 Lock 之间的协议，而非与 Apple 之间的协议。Apple 不对本 App 及其内容负责。您对本 App 的使用同时受 Apple《授权应用程序最终用户许可协议》约束。' },
      { title: '联系我们', body: '如有疑问，请发邮件至 support@jkeroro.com' },
    ],
  },
  'zh-TW': {
    intro: '下載、安裝或使用 Lock，即表示您同意本服務條款。',
    lastUpdated: '最後更新：2026 年 11 月 8 日',
    sections: [
      { title: '服務說明', body: `Lock 提供 AI 食物辨識與熱量追蹤、訓練計畫與紀錄、體重紀錄、健康資料（步數、活動能量）、社交功能（好友、排行榜、夥伴）、兩位好友綁定的情侶空間、Apple Watch App 和訓練即時動態，以及個人化的飲食和訓練分析。

Lock 提供的內容僅供參考，不構成醫療建議。` },
      { title: '帳號註冊', body: `• 您必須年滿 18 歲
• 您有責任妥善保管帳號憑證
• 請勿與他人共用帳號
• 如發現未經授權的存取，請立即告訴我們` },
      { title: '訂閱與付款', body: `免費版：每個新帳號前 7 天免費享有 Lock Pro（無需綁卡），之後每天 3 次 AI 辨識；每週 1 次 AI 飲食分析；條碼和手動記錄不限次數；訓練計畫與紀錄；體重曲線、情侶空間和資料匯出；好友不限。

Lock Pro：無限 AI 辨識、無限 AI 飲食分析，以及隨時重新產生 AI 訓練計畫。Lock Pro 為自動續訂訂閱，提供年繳（美國 $39.99）和月繳（美國 $7.99）。其他國家和地區的價格在購買前會顯示於 App Store。

• 首週 Pro 試用免費，到期自動結束；除非您訂閱，否則不會扣款
• 確認購買時從您的 Apple ID 帳戶扣款
• 除非在目前週期結束前至少 24 小時取消，訂閱將自動續訂；續訂費用在週期結束前 24 小時內扣除
• 您可以在 App Store 帳戶設定中管理或取消訂閱
• 已付週期中未使用的部分不予退款，法律或 Apple 另有規定者除外` },
      { title: '使用者內容與零容忍政策', body: `您需對您的個人資料、為夥伴和教練取的名字，以及在情侶空間中新增的紀念日等內容負責。Lock 對不當內容和惡意使用者零容忍。您同意不發布或傳送：

• 色情、裸露或性暗示內容
• 騷擾、霸凌、威脅或仇恨言論
• 暴力、自殘或宣揚飲食失調的內容
• 垃圾訊息、詐騙或誤導性資訊
• 侵犯他人隱私或智慧財產權的內容
• 任何違法內容

您可以在好友排行榜中封鎖使用者（並在設定中解除），並向 support@jkeroro.com 檢舉濫用行為。我們會在 24 小時內處理檢舉，移除違規內容，並對違規使用者予以警告、限制或永久停權。` },
      { title: '合理使用', body: `• 不得未經授權存取本服務或他人帳號
• 不得使用機器人、爬蟲或其他自動化工具存取本服務
• 不得干擾或破壞本服務
• 不得違反任何適用法律` },
      { title: '健康免責聲明', body: `Lock 提供的熱量估算和飲食建議僅供參考，不構成專業醫療建議。

• AI 辨識的食物資料可能有誤差
• 開始新的飲食或運動計畫前，請諮詢醫師或註冊營養師
• 如果您有或曾有飲食失調，請在記錄熱量前先諮詢專業人士
• 訓練計畫、加重建議和消耗熱量估算均為一般性參考，請在自身能力範圍內訓練
• 對因依賴 App 資料而產生的健康問題，我們不承擔責任
• Lock 熱量、蛋白質、飲水和步數目標的參考來源見 設定 → 目標 → 參考來源，以及 lock.jkeroro.com/sources` },
      { title: '智慧財產權', body: 'Lock App、品牌和內容（使用者發布的內容除外）歸 Lock 團隊所有，受智慧財產權法保護。您保留所發布內容的所有權，並授權我們為運作服務而儲存這些內容並向您分享的對象展示。' },
      { title: '終止', body: '您可以隨時停止使用 Lock 並刪除帳號。對於違反本條款的帳號，我們可能暫停或終止其使用。' },
      { title: '責任限制', body: `在法律允許的最大範圍內，對於因使用或無法使用本服務、資料遺失或損毀、或第三方造成的損害而產生的損失，Lock 不承擔責任。

我們的最高責任不超過您過去 12 個月支付的訂閱費用。` },
      { title: 'Apple App Store', body: '本條款是您與 Lock 之間的協議，而非與 Apple 之間的協議。Apple 不對本 App 及其內容負責。您對本 App 的使用同時受 Apple《授權應用程式終端使用者授權協議》約束。' },
      { title: '聯絡我們', body: '如有疑問，請寄信至 support@jkeroro.com' },
    ],
  },
  'ja-JP': {
    intro: 'Lock をダウンロード、インストール、または使用することで、本利用規約に同意したものとみなされます。',
    lastUpdated: '最終更新：2026年11月8日',
    sections: [
      { title: 'サービスの内容', body: `Lock は、AI 食品認識とカロリー記録、トレーニングプランと記録、体重の記録、健康データ（歩数、アクティブエネルギー）、ソーシャル機能（友達、ランキング、バディ）、ふたりの友達をつなぐカップルスペース、Apple Watch アプリとトレーニングのライブアクティビティ、パーソナライズされた食事とトレーニングの分析を提供します。

Lock が提供する内容は情報提供のみを目的としており、医療アドバイスではありません。` },
      { title: 'アカウント登録', body: `• 18歳以上である必要があります
• ログイン情報を安全に管理する責任があります
• アカウントを他人と共有しないでください
• 不正アクセスに気づいたら直ちにご連絡ください` },
      { title: 'サブスクリプションと支払い', body: `無料：新規アカウントは最初の7日間 Lock Pro を無料で利用でき（カード登録不要）、その後は1日3回の AI スキャン、週1回の AI 食事分析、バーコードと手入力は無制限、トレーニングプランと記録、体重グラフ、カップルスペース、データエクスポート、友達は無制限です。

Lock Pro：AI スキャン無制限、AI 食事分析無制限、AI トレーニングプランをいつでも作り直し。Lock Pro は自動更新のサブスクリプションで、年額（米国 $39.99）と月額（米国 $7.99）があります。他の国の価格は購入前に App Store に表示されます。

• 最初の1週間の Pro トライアルは無料で、自動的に終了します。サブスクリプションに登録しない限り課金されません
• 購入確定時に Apple ID アカウントに請求されます
• 現在の期間終了の24時間前までに解約しない限り自動更新され、期間終了前の24時間以内に更新料金が請求されます
• サブスクリプションは App Store のアカウント設定で管理・解約できます
• 法律または Apple が求める場合を除き、支払い済み期間の未使用分は返金されません` },
      { title: 'ユーザーコンテンツとゼロトレランス方針', body: `プロフィール情報、バディとコーチの名前、カップルスペースに追加した記念日などのコンテンツについては、お客様が責任を負います。Lock は不適切なコンテンツと悪質なユーザーに対してゼロトレランスです。次のものを投稿・送信しないことに同意するものとします：

• 性的、ヌード、性的な示唆を含むコンテンツ
• 嫌がらせ、いじめ、脅迫、ヘイトスピーチ
• 暴力、自傷行為、摂食障害を助長するコンテンツ
• スパム、詐欺、誤解を招く情報
• 他者のプライバシーや知的財産を侵害するコンテンツ
• 違法なもの

友達ランキングからユーザーをブロックでき（設定で解除可能）、不正行為は support@jkeroro.com に報告できます。報告は24時間以内に確認し、違反コンテンツを削除し、規則に違反したユーザーには警告、制限、または永久停止を行います。` },
      { title: '禁止事項', body: `• 許可なくサービスや他人のアカウントにアクセスしないこと
• ボット、スクレイパー、その他の自動化ツールでサービスにアクセスしないこと
• サービスを妨害・中断しないこと
• 適用される法律に違反しないこと` },
      { title: '健康に関する免責事項', body: `Lock のカロリー推定と食事のアドバイスは参考情報であり、専門的な医療アドバイスではありません。

• AI が認識した食品データには誤りが含まれる場合があります
• 新しい食事や運動を始める前に、医師または管理栄養士に相談してください
• 摂食障害がある方、または過去にあった方は、カロリーを記録する前に専門家に相談してください
• トレーニングプラン、重量アップの提案、消費カロリーの推定は一般的な目安です。ご自身の限界の範囲内でトレーニングしてください
• アプリのデータに依拠したことによる健康上の問題について、当社は責任を負いません
• Lock のカロリー、たんぱく質、水分、歩数の目標の根拠は、設定 → 目標 → 出典と計算方法、および lock.jkeroro.com/sources に掲載しています` },
      { title: '知的財産', body: 'Lock アプリ、ブランド、コンテンツ（ユーザーが投稿したものを除く）は Lock チームに帰属し、知的財産法で保護されています。お客様は投稿したコンテンツの所有権を保持し、サービス運営のため、それを保存し共有相手に表示するライセンスを当社に付与します。' },
      { title: '利用の終了', body: 'お客様はいつでも Lock の利用をやめ、アカウントを削除できます。本規約に違反したアカウントは、停止または終了することがあります。' },
      { title: '責任の制限', body: `法律で認められる最大限の範囲で、Lock はサービスの利用または利用不能、データの消失や破損、第三者による損害から生じた損失について責任を負いません。

当社の責任の上限は、過去12か月間にお客様が支払ったサブスクリプション料金を超えないものとします。` },
      { title: 'Apple App Store', body: '本規約はお客様と Lock との間のものであり、Apple との間のものではありません。Apple はアプリおよびその内容について責任を負いません。アプリの利用には Apple の「ライセンス対象アプリケーションのエンドユーザ使用許諾契約」も適用されます。' },
      { title: 'お問い合わせ', body: 'ご質問は support@jkeroro.com までメールでお送りください' },
    ],
  },
  'ko-KR': {
    intro: 'Lock을 다운로드, 설치 또는 사용하면 본 이용약관에 동의하는 것으로 간주됩니다.',
    lastUpdated: '최종 업데이트: 2026년 11월 8일',
    sections: [
      { title: '서비스 설명', body: `Lock은 AI 음식 인식 및 칼로리 기록, 운동 계획 및 기록, 체중 기록, 건강 데이터(걸음수, 활동 에너지), 소셜 기능(친구, 순위, 버디), 두 친구를 잇는 커플 공간, Apple Watch 앱과 운동 실시간 현황, 개인화된 식단 및 운동 분석을 제공합니다.

Lock이 제공하는 콘텐츠는 정보 제공용이며 의료 조언이 아닙니다.` },
      { title: '계정 등록', body: `• 만 18세 이상이어야 합니다
• 로그인 정보를 안전하게 관리할 책임이 있습니다
• 계정을 다른 사람과 공유하지 마세요
• 무단 접근을 발견하면 즉시 알려 주세요` },
      { title: '구독 및 결제', body: `무료: 모든 신규 계정은 첫 7일 동안 Lock Pro를 무료로 사용할 수 있고(카드 불필요), 이후 하루 3회 AI 스캔, 주 1회 AI 식단 분석, 바코드 및 직접 입력 무제한, 운동 계획 및 기록, 체중 곡선, 커플 공간, 데이터 내보내기, 친구 무제한입니다.

Lock Pro: AI 스캔 무제한, AI 식단 분석 무제한, AI 운동 계획 언제든 다시 만들기. Lock Pro는 자동 갱신 구독으로 연간(미국 $39.99)과 월간(미국 $7.99)이 있습니다. 다른 국가의 가격은 구매 전에 App Store에 표시됩니다.

• 첫 주 Pro 체험은 무료이며 자동으로 종료됩니다. 구독하지 않으면 요금이 청구되지 않습니다
• 구매 확인 시 Apple ID 계정으로 결제됩니다
• 현재 기간이 끝나기 최소 24시간 전에 해지하지 않으면 자동 갱신되며, 기간 종료 전 24시간 이내에 갱신 요금이 청구됩니다
• App Store 계정 설정에서 구독을 관리하거나 해지할 수 있습니다
• 법률 또는 Apple이 요구하는 경우를 제외하고 결제한 기간의 미사용분은 환불되지 않습니다` },
      { title: '사용자 콘텐츠 및 무관용 정책', body: `프로필 정보, 버디와 코치 이름, 커플 공간에 추가한 기념일 등의 콘텐츠에 대한 책임은 회원님에게 있습니다. Lock은 부적절한 콘텐츠와 악의적인 사용자에 대해 무관용 원칙을 적용합니다. 다음을 게시하거나 보내지 않을 것에 동의합니다:

• 성적, 노출 또는 성적으로 암시적인 콘텐츠
• 괴롭힘, 따돌림, 위협 또는 혐오 발언
• 폭력, 자해 또는 섭식 장애를 조장하는 콘텐츠
• 스팸, 사기 또는 오해를 불러일으키는 정보
• 타인의 개인정보나 지식재산권을 침해하는 콘텐츠
• 불법적인 모든 것

친구 순위에서 사용자를 차단할 수 있으며(설정에서 해제 가능), 악용 사례는 support@jkeroro.com으로 신고할 수 있습니다. 신고는 24시간 이내에 검토하며, 위반 콘텐츠를 삭제하고 규칙을 어긴 사용자에게 경고, 제한 또는 영구 정지 조치를 취합니다.` },
      { title: '이용 규칙', body: `• 허가 없이 서비스나 다른 계정에 접근하지 마세요
• 봇, 스크래퍼 등 자동화 도구로 서비스에 접근하지 마세요
• 서비스를 방해하거나 중단시키지 마세요
• 관련 법률을 위반하지 마세요` },
      { title: '건강 면책 조항', body: `Lock의 칼로리 추정과 식단 제안은 참고용이며 전문 의료 조언이 아닙니다.

• AI가 인식한 음식 데이터에는 오류가 있을 수 있습니다
• 새로운 식단이나 운동을 시작하기 전에 의사 또는 영양사와 상담하세요
• 섭식 장애가 있거나 있었던 경우 칼로리를 기록하기 전에 전문가와 상담하세요
• 운동 계획, 무게 증가 제안, 소모 칼로리 추정은 일반적인 참고 사항입니다. 자신의 한계 안에서 운동하세요
• 앱 데이터에 의존해 발생한 건강 문제에 대해 당사는 책임지지 않습니다
• Lock의 칼로리, 단백질, 물, 걸음수 목표의 근거는 설정 → 목표 → 출처 및 계산 방법과 lock.jkeroro.com/sources에서 확인할 수 있습니다` },
      { title: '지식재산권', body: 'Lock 앱, 브랜드 및 콘텐츠(사용자가 게시한 콘텐츠 제외)는 Lock 팀에 속하며 지식재산권법의 보호를 받습니다. 회원님은 게시한 콘텐츠의 소유권을 유지하며, 서비스 운영을 위해 이를 저장하고 공유 대상에게 표시할 수 있는 라이선스를 당사에 부여합니다.' },
      { title: '이용 종료', body: '회원님은 언제든지 Lock 사용을 중단하고 계정을 삭제할 수 있습니다. 본 약관을 위반한 계정은 정지되거나 해지될 수 있습니다.' },
      { title: '책임 제한', body: `법률이 허용하는 최대 범위 내에서 Lock은 서비스 이용 또는 이용 불가, 데이터 손실 또는 손상, 제3자로 인한 손해에서 발생한 손실에 대해 책임지지 않습니다.

당사의 최대 책임은 회원님이 지난 12개월 동안 지불한 구독료를 초과하지 않습니다.` },
      { title: 'Apple App Store', body: '본 약관은 회원님과 Lock 간의 계약이며 Apple과의 계약이 아닙니다. Apple은 앱과 그 콘텐츠에 대해 책임지지 않습니다. 앱 이용에는 Apple의 라이선스 응용 프로그램 최종 사용자 사용권 계약도 적용됩니다.' },
      { title: '문의', body: '궁금한 점은 support@jkeroro.com으로 이메일을 보내 주세요' },
    ],
  },
};

export function getPrivacyContent(lang: LanguageCode): LegalContent {
  return privacyContent[lang] ?? privacyContent['en-US'];
}

export function getTermsContent(lang: LanguageCode): LegalContent {
  return termsContent[lang] ?? termsContent['en-US'];
}
