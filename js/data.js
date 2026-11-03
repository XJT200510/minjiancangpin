const key='mincang-refined-v1', now=()=>new Date().toISOString();
const options={category_id:['陶瓷','木器','文献','民间艺术'],era_id:['清代','民国','近现代'],course_category_id:['藏品知识','数字建档','保存整理','民俗文化']};
const names={collection:'藏品',post:'帖子',question:'问题',topic:'话题',course:'课程',activity:'活动',exhibition:'专题展览',announcement:'公告'};
const F=(key,label,type='text',required=false,max=255,values=null)=>({key,label,type,required,max,values});
const specs={
 collection:[F('collection_name','藏品名称','text',true,100),F('category_id','藏品分类','select',true,0,options.category_id),F('era_id','藏品年代','select',true,0,options.era_id),F('material','材质','text',false,100),F('size_information','尺寸信息','text',false,100),F('source','来源与流传经历','textarea',true,1000),F('description','藏品描述','textarea',true,2000),F('cover_image','封面图片','image'),F('image_urls','补充图片地址（每行一个）','textarea',false,500),F('tags','标签','text',false,100)],
 post:[F('post_title','帖子标题','text',true,200),F('content','正文','textarea',true,10000),F('cover_url','帖子封面','image'),F('visibility','可见范围','select',true,0,['公开','仅自己可见']),F('topics','所属话题','text',false,100)],
 question:[F('question_title','问题标题','text',true,100),F('content','问题背景与已尝试的方法','textarea',true,2000),F('topics','所属话题','text',false,100)],
 topic:[F('topic_name','话题名称','text',true,100),F('topic_description','话题介绍','textarea',true,500),F('cover_url','话题封面','image')],
 course:[F('course_title','课程名称','text',true,120),F('course_category_id','课程分类','select',true,0,options.course_category_id),F('introduction','课程简介','textarea',true,500),F('cover_url','课程封面','image')],
 activity:[F('content','活动内容与安排','textarea',true,2000),F('activity_time','活动时间','datetime-local',true),F('activity_location','活动地点','text',true,200),F('activity_category','活动类别','select',true,0,['收藏交流','文化讲座','整理工作坊']),F('registration_deadline','报名截止时间','datetime-local',true),F('max_participants','报名人数上限','number',true)],
 exhibition:[F('topic_name','专题名称','text',true,100),F('introduction','专题介绍','textarea',true,2000),F('start_date','开始时间','datetime-local'),F('end_date','结束时间','datetime-local'),F('cover_url','专题封面','image'),F('collection_ids','选择参展藏品','collections',true,0)],
 announcement:[F('announcement_title','公告标题','text',true,100),F('announcement_content','公告正文','textarea',true,2000),F('start_time','展示开始','datetime-local'),F('end_time','展示结束','datetime-local')]
};
const permissions=['用户身份查询','账号封禁与解封','身份认定审核','藏品最终审核','课程审核','活动审核','藏品管理','帖子管理','话题管理','问答管理','课程管理','活动管理','公告管理','专题展览管理','鉴定任务分配','评论管理','回复管理','课程评分管理','内容举报处理','账号举报处理'];
function seed(){const s={version:2,current:1,seq:100,users:[{id:1,name:'林知秋',phone:'13800000001',intro:'记录家中器物，收藏生活记忆。',roles:[],status:'正常'},{id:2,name:'许文博',phone:'13800000002',intro:'陶瓷与民间器物研究者。',roles:['专家','课程发布人'],status:'正常'},{id:3,name:'江南民俗文化中心',phone:'13800000003',intro:'面向社区开展民俗文化交流。',roles:['机构'],status:'正常'},{id:4,name:'陈宁',phone:'13800000004',roles:['管理员'],status:'正常',roleIds:[1]},{id:5,name:'周明',phone:'13800000005',roles:['超级管理员'],status:'正常',roleIds:[1]},{id:6,name:'陈砚生',phone:'13800000006',roles:['专家'],status:'正常'},{id:7,name:'周予安',phone:'13800000007',roles:['专家'],status:'正常'}],records:[],comments:[],answers:[],replies:[],likes:[],favorites:[],folders:[{id:1,user:1,name:'默认收藏夹',default:true}],ratings:[],relations:[],footprints:[],messages:[{id:1,sender:2,receiver:1,content:'你记录的木匣很有意思，拍摄时可以补一张底部全貌。',time:'2026-10-26T09:30:00',hidden:[]}],notifications:[{id:1,user:1,title:'欢迎来到民藏',content:'从记录一件家中老物件开始吧。',time:'2026-10-26T08:00:00',route:'resource'}],applications:[],invitations:[],appraisals:[],enrollments:[],certificates:[],reports:[],appeals:[],logs:[],roles:[{id:1,name:'综合管理员',description:'日常审核与平台管理',permissions:[...permissions],enabled:true}],specialties:[{expert:2,category:'陶瓷',era:'清代'},{expert:6,category:'陶瓷',era:'清代'},{expert:7,category:'陶瓷',era:'清代'}]};
 const add=(id,kind,user,title,body,img,extra={})=>s.records.push({id,kind,user,title,body,img,status:'已发布',created:`2026-10-${String(10+id).padStart(2,'0')}T${String(8+id).padStart(2,'0')}:20:00`,updated:`2026-10-${String(12+id).padStart(2,'0')}T${String(9+id).padStart(2,'0')}:35:00`,...extra});
 const museumItems = [
            {
                id: 1,
                title: '清代青花缠枝莲纹瓶',
                body: '清康熙年间的青花瓷瓶，饰有缠枝莲纹。图片来源：大都会艺术博物馆。',
                category_id: '陶瓷',
                era_id: '清代',
                material: '瓷',
                size_information: '高44.5厘米，直径22.5厘米',
                cover_image: 'assets/青花缠枝莲纹瓶.jpg',
                tags: '青花,缠枝莲纹'
            },
            {
                id: 2,
                title: '清代山水吉祥纹盒',
                body: '清代雕漆盒，装饰山水和吉祥图案。图片来源：大都会艺术博物馆。',
                category_id: '民间艺术',
                era_id: '清代',
                material: '雕漆',
                size_information: '高14.6厘米，长宽23.8厘米',
                cover_image: 'assets/山水吉祥纹盒.jpg',
                tags: '雕漆,吉祥纹样'
            },
            {
                id: 3,
                title: '清代木版画《新春乐》',
                body: '中国清代彩色木版画，展现新春庆祝场景。图片来源：克利夫兰艺术博物馆。',
                category_id: '民间艺术',
                era_id: '清代',
                material: '纸本彩色木版画',
                size_information: '38.4 × 54.6厘米',
                cover_image: 'assets/新春乐木版画.jpg',
                tags: '木版画,新春'
            }
        ];
 museumItems.forEach(item => add(item.id, 'collection', item.id === 3 ? 6 : 1,
   item.title, item.body, 'letters', {...item, collection_name:item.title,
   description:item.body, source:'博物馆馆藏，详见图片来源'}));
 add(4,'post',1,'第一次给家中老物件建档，我记录了什么？','先拍全貌，再拍细节。我把不确定的来源标为待核实，没有凭印象写成确定年份。大家还有什么建议？','album',{post_title:'第一次给家中老物件建档，我记录了什么？',content:'先拍全貌，再拍细节。我把不确定的来源标为待核实，没有凭印象写成确定年份。大家还有什么建议？',visibility:'公开',topics:'数字建档'});
 add(5,'question',1,'拍摄瓷器底款如何避免反光？','台灯下总有一块亮斑，换了几个角度仍看不清文字。有不需要专业设备的方法吗？','vase',{question_title:'拍摄瓷器底款如何避免反光？',content:'台灯下总有一块亮斑，换了几个角度仍看不清文字。',topics:'数字建档',resolved:false});
 add(6,'topic',2,'数字建档','交流拍照、命名、编号和资料整理方法。','letters',{topic_name:'数字建档',topic_description:'交流拍照、命名、编号和资料整理方法。'});
 add(7,'course',2,'藏品数字建档入门','从整体观察到资料归档，学习为一件器物建立清晰的记录。','vase',{course_title:'藏品数字建档入门',introduction:'从整体观察到资料归档，学习为一件器物建立清晰的记录。',course_category_id:'数字建档',lessons:[{id:1,lesson_title:'先观察，再记录',lesson_order:1,content:'认识整体、局部与来源记录。',video_url:'',duration:12,material_reference:''},{id:2,lesson_title:'拍摄清晰的器物照片',lesson_order:2,content:'了解自然光拍摄与背景选择。',video_url:'',duration:18,material_reference:''}]});
 add(8,'activity',3,'周末民间收藏交流会','带上一件藏品的照片，一起交流记录方法和家庭故事。','basket',{content:'周末民间收藏交流会：带上一件藏品的照片，一起交流记录方法和家庭故事。',activity_time:'2026-12-12T14:00',activity_location:'江南民俗文化中心二楼',registration_deadline:'2026-12-10T18:00',max_participants:30});
 add(9,'exhibition',3,'器物里的江南生活','从瓷瓶到木匣，走近家庭生活中的文化记忆。','wood',{topic_name:'器物里的江南生活',introduction:'从瓷瓶到木匣，走近家庭生活中的文化记忆。',collection_ids:'1,2,3'});
 add(10,'announcement',4,'藏品资料填写说明','请如实记录来源。不确定的年代与作者可以标注待核实，避免将推测作为定论。','letters',{announcement_title:'藏品资料填写说明',announcement_content:'请如实记录来源。不确定的年代与作者可以标注待核实。'});
 /* 论坛交流演示数据：帖子 6 条 / 问题 6 条 / 话题 4 个。
    互动量刻意做得不一致，热帖榜、热门问题榜、热门话题榜才有区分度。 */
 const fd=(id,kind,user,title,body,img,topics,day,extra={})=>s.records.push({id,kind,user,title,body,img,status:'已发布',visibility:'公开',topics,created:`2026-10-${String(day).padStart(2,'0')}T${String(8+id%9).padStart(2,'0')}:20:00`,updated:`2026-10-${String(day).padStart(2,'0')}T${String(9+id%9).padStart(2,'0')}:40:00`,...extra});

 // —— 话题 ——
 fd(23,'topic',2,'器物摄影','交流自然光的用法、构图取舍与细节拍摄，让照片更接近实物。','album','',11,{topic_name:'器物摄影',topic_description:'交流自然光的用法、构图取舍与细节拍摄。'});
 fd(24,'topic',1,'老物件故事','家里那件东西的来历、谁用过、为什么一直留着。','letters','',12,{topic_name:'老物件故事',topic_description:'家里那件东西的来历、谁用过、为什么一直留着。'});
 fd(25,'topic',3,'木作文房','木匣、笔筒、算盘一类木器的辨识、修复与日常保养。','basket','',13,{topic_name:'木作文房',topic_description:'木匣、笔筒、算盘一类木器的辨识、修复与日常保养。'});
 fd(26,'topic',7,'瓷器鉴定','从底款、胎釉、器型与纹饰入手，一点点把观察写清楚。','bowl','',14,{topic_name:'瓷器鉴定',topic_description:'从底款、胎釉、器型与纹饰入手，一点点把观察写清楚。'});

 // —— 帖子 ——
 fd(31,'post',1,'一张底款照片，看清了年代线索','把台灯换成侧向的自然光，底款的青花发色和釉面气泡都能看清了。我的做法是先把器物放到窗边，再用手挡掉直射的那部分光。','wood','瓷器鉴定,器物摄影',21,{post_title:'一张底款照片，看清了年代线索',content:'把台灯换成侧向的自然光，底款的青花发色和釉面气泡都能看清了。'});
 fd(32,'post',3,'外婆的木梳妆匣，榫卯还在','匣盖内侧有一行手写的名字，字迹已经淡了。木料是榉木，铜活氧化成暗绿色，但开合仍然顺滑。','basket','木作文房,老物件故事',20,{post_title:'外婆的木梳妆匣，榫卯还在',content:'匣盖内侧有一行手写的名字，字迹已经淡了。木料是榉木，铜活氧化成暗绿色。'});
 fd(33,'post',2,'自然光下拍青花，从反光到纹饰','阴天的散射光最稳。把手机固定住、用定时器避免手抖，纹饰的层次会清楚很多。','vase','器物摄影,瓷器鉴定',19,{post_title:'自然光下拍青花，从反光到纹饰',content:'阴天的散射光最稳。把手机固定住、用定时器避免手抖，纹饰的层次会清楚很多。'});
 fd(34,'post',7,'老照片上的题字该怎么存档','除了翻拍正面，我把背面的题字也单独拍了一张，并在说明里注明拍摄时间与存放位置。','letters','数字建档,老物件故事',18,{post_title:'老照片上的题字该怎么存档',content:'除了翻拍正面，我把背面的题字也单独拍了一张，并在说明里注明拍摄时间与存放位置。'});
 fd(35,'post',1,'给每件器物写一段来历，比编号更重要','编号解决的是找到它，来历解决的是为什么留着它。我习惯先写一段口述，再补年代与尺寸。','album','老物件故事,数字建档',17,{post_title:'给每件器物写一段来历，比编号更重要',content:'编号解决的是找到它，来历解决的是为什么留着它。'});
 fd(36,'post',3,'木器保养：别用湿布，先说清原因','湿气会让木料涨缩，漆面容易起翘。日常只用干软布除尘，雨季在柜里放一包干燥剂。','clock','木作文房',16,{post_title:'木器保养：别用湿布，先说清原因',content:'湿气会让木料涨缩，漆面容易起翘。日常只用干软布除尘。'});

 // —— 问题 ——
 fd(17,'question',1,'底足的火石红能作为断代依据吗','底足露胎处有一圈橙红色，有人说这是老件的特征，也有人说是烧成气氛造成的。该怎么看？','vase','瓷器鉴定',21,{question_title:'底足的火石红能作为断代依据吗',content:'底足露胎处有一圈橙红色，有人说这是老件的特征，也有人说是烧成气氛造成的。',resolved:false});
 fd(18,'question',3,'木匣上的铜活锈了，要不要除锈','暗绿色的锈迹已经影响开合手感，但担心一除就伤了原来的皮壳。','basket','木作文房',20,{question_title:'木匣上的铜活锈了，要不要除锈',content:'暗绿色的锈迹已经影响开合手感，但担心一除就伤了原来的皮壳。',resolved:true});
 fd(19,'question',7,'老照片背面写字，用什么笔不伤纸','想标注时间和人物，又怕墨水往正面透。','letters','数字建档',19,{question_title:'老照片背面写字，用什么笔不伤纸',content:'想标注时间和人物，又怕墨水往正面透。',resolved:false});
 fd(20,'question',1,'手机拍器物，怎样避免边缘变形','竖着拍瓶类总感觉上头大下头小，是不是镜头的问题？','album','器物摄影',18,{question_title:'手机拍器物，怎样避免边缘变形',content:'竖着拍瓶类总感觉上头大下头小，是不是镜头的问题？',resolved:true});
 fd(21,'question',2,'藏品来源说不清，建档时该怎么写','长辈留下的，具体从哪来的已经问不到了，这一栏空着又不像完整的档案。','tickets','数字建档',17,{question_title:'藏品来源说不清，建档时该怎么写',content:'长辈留下的，具体从哪来的已经问不到了，这一栏空着又不像完整的档案。',resolved:false});
 fd(22,'question',6,'粉彩和珐琅彩，肉眼怎么区分','两件小碟看着都是彩绘，上手看胎和彩料又不敢确定。','bowl','瓷器鉴定',16,{question_title:'粉彩和珐琅彩，肉眼怎么区分',content:'两件小碟看着都是彩绘，上手看胎和彩料又不敢确定。',resolved:false});

 // —— 互动数据：点赞 / 收藏 / 评论 / 回答 ——
 const lk=(record,users)=>users.forEach((u,i)=>s.likes.push({user:u,record,time:`2026-10-2${i}T10:00:00`}));
 const fv=(record,users)=>users.forEach((u,i)=>s.favorites.push({record,user:u,folder:1,time:`2026-10-2${i}T10:30:00`}));
 const cm2=(record,user,content)=>s.comments.push({id:200+s.comments.length,record,user,content,time:'2026-10-23T09:30:00'});
 lk(4,[2]); cm2(4,6,'底足照片很清楚，建议再补充口沿特写。');
 lk(31,[1,3,7]); fv(31,[2,6]); cm2(31,2,'侧光确实有效，我试了一下底款清楚多了。');
 lk(32,[1,2]);   fv(32,[3,7,1]); cm2(32,1,'这种有手写名字的木匣最难得了。'); cm2(32,6,'铜活别急着擦，包浆也是信息。');
 lk(33,[1,2,6]); fv(33,[3]); cm2(33,7,'定时器这招好用，我一直在抖。');
 lk(34,[1,3]);   fv(34,[2]); cm2(34,1,'背面也拍一张这个习惯要学。');
 lk(35,[2]);     fv(35,[1]); cm2(35,3,'口述那段最值钱，建议连录音一起存。');
 lk(36,[3]);
 const an2=(id,record,user,content,accepted)=>s.answers.push({id,record,user,content,accepted,time:'2026-10-23T11:00:00'});
 an2(101,18,6,'先别整体除锈。用软布干擦掉浮锈，开合处上一点蜡即可。',true);
 an2(102,18,7,'铜绿本身是稳定层，大面积洗掉反而会露新铜色。',false);
 an2(103,18,2,'如果已经影响开合，只需处理轴销，不要动表面的皮壳。',false);
 an2(104,19,2,'用软铅笔在无影像的边角轻写，或者另附一张说明纸。',true);
 an2(105,20,2,'用手机的长焦端退后拍，广角贴近拍必然变形。',true);
 an2(106,20,7,'关键是让镜头高度落在器物中部，再稍微退远裁切。',false);
 an2(107,22,2,'看彩料：粉彩用玻璃白打底，颜色有厚度；珐琅彩更平、更像油画。',true);
 an2(108,22,6,'还要看胎，珐琅彩多为景德镇素胎送内廷二次烧成。',false);
 an2(109,22,7,'放大看彩料边缘，粉彩有渲染过渡，珐琅彩边界更硬。',false);
 an2(110,22,1,'受教了，我一直只凭颜色判断。',false);

 s.answers.push({id:1,record:5,user:2,content:'可以试试靠窗的柔和自然光，先关掉直射台灯，再稍微调整器物角度。',accepted:false,time:'2026-10-22T10:00:00'});s.comments.push({id:1,record:1,user:6,content:'底足照片很清楚，建议再补充口沿特写。',time:'2026-10-23T10:00:00'});const exhibitions = [
    {title:'纸短情长：家书里的牵挂',body:'从一封家书，读懂生活中的记忆与牵挂。',cover:'assets/exhibition-letters.png',items:'1,3'},
    {title:'青花里的匠心',body:'从器形与纹饰认识青花瓷的工艺之美。',cover:'assets/exhibition-porcelain.png',items:'1'},
    {title:'年画里的新春',body:'从木版年画中发现岁时习俗与美好祝愿。',cover:'assets/exhibition-newyear.png',items:'3'}
  ];
 exhibitions.forEach((item, index) => add(11 + index, 'exhibition', 3, item.title, item.body, 'letters', {
   topic_name:item.title, introduction:item.body, cover_url:item.cover, collection_ids:item.items
 }));
 return s;}
 let db; try { db = JSON.parse(localStorage.getItem(key)); if (!db || db.version !== 2) db = seed(); } catch { db = seed(); }

const user=()=>db.users.find(x=>x.id===db.current);
const uname=id=>db.users.find(x=>x.id===id)?.name||"已注销用户";
const rec=id=>db.records.find(x=>x.id===+id);
const uid=()=>++db.seq;
function notify(id,title,content,route='profile/notifications'){db.notifications.unshift({id:uid(),user:id,title,content,route,time:now()});}
function log(text){db.logs.unshift({id:uid(),user:db.current,text,time:now()});}
function admin(){return user()?.roles.some(r=>['管理员','超级管理员'].includes(r));}
function can(permission){if(user()?.status!=='正常')return false;if(user()?.roles.includes('超级管理员'))return true;return admin()&&db.roles.some(r=>r.enabled&&user().roleIds?.includes(r.id)&&r.permissions.includes(permission));}
function visible(r){return r.status==='已发布'&&(r.visibility!=='仅自己可见'||r.user===db.current);}
function rating(id){let a=db.ratings.filter(x=>x.record===id&&!x.deleted);return a.length?`★ ${(a.reduce((v,x)=>v+x.score,0)/a.length).toFixed(1)} · ${a.length}人评价`:'暂无评分';}
// Return persistence status; the UI layer decides how to display an error.
function save(){try{localStorage.setItem(key,JSON.stringify(db));return true;}catch{return false;}}
function resetData(){db=seed();return save();}
export { db, seed, save, resetData, key, now, options, names, F, specs, permissions, user, uname, rec, uid, notify, log, admin, can, visible, rating };

function allowedKind(kind){if(!user()||user().status!=='正常')return false;if(kind==='course')return user().roles.includes('课程发布人');if(kind==='activity')return user().roles.includes('机构');if(['announcement','exhibition'].includes(kind))return can(kind==='announcement'?'公告管理':'专题展览管理');return true;}

export { allowedKind };
