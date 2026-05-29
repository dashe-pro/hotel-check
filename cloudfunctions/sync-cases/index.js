const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

// 案例分级匹配：
//   matchMode: 'precise' — 品牌+城市精确匹配，只关联第一家酒店
//   matchMode: 'alert'   — 通用行业警示，不匹配单店

const CASES = [
  // ==================== 如家系列 ====================
  { brands: ['如家'], matchMode: 'precise', city: '郑州', hotelName: '如家', content: '2020年郑州如家酒店住客在电视机下方发现针孔摄像头，正对床位进行偷拍，警方已介入调查。', discoveryDate: '2020-07-20', source: '河南都市频道' },
  { brands: ['如家'], matchMode: 'precise', city: '北京', hotelName: '如家', content: '2018年北京如家快捷酒店多间客房被发现暗藏摄像头，涉案人员利用入住机会安装设备，被依法追究刑责。', discoveryDate: '2018-03-12', source: '北京晚报' },
  { brands: ['如家'], matchMode: 'precise', city: '广州', hotelName: '如家', content: '2022年广州如家商旅酒店客房插座内发现针孔摄像头，酒店称已全面排查安全隐患并加强员工培训。', discoveryDate: '2022-09-08', source: '羊城晚报' },

  // ==================== 7天系列 ====================
  { brands: ['7天', '七天'], matchMode: 'precise', city: '成都', hotelName: '7天', content: '2019年成都7天酒店客房空调出风口发现微型摄像头，涉案人员被警方抓获，查获大量偷拍视频。', discoveryDate: '2019-11-03', source: '华西都市报' },
  { brands: ['7天', '七天'], matchMode: 'precise', city: '深圳', hotelName: '7天', content: '2021年深圳7天酒店客房路由器指示灯处发现伪装的针孔摄像头，经警方侦查系惯犯所为。', discoveryDate: '2021-06-14', source: '南方都市报' },

  // ==================== 汉庭系列 ====================
  { brands: ['汉庭'], matchMode: 'precise', city: '南京', hotelName: '汉庭', content: '2019年南京汉庭酒店客房电视机顶盒内发现伪装摄像头，可远程传输画面，嫌疑人被警方刑拘。', discoveryDate: '2019-07-28', source: '现代快报' },
  { brands: ['汉庭'], matchMode: 'precise', city: '武汉', hotelName: '汉庭', content: '2022年武汉汉庭酒店住客在浴室排风扇中发现防水针孔摄像头，酒店回应将每月进行专业反窃密检查。', discoveryDate: '2022-05-12', source: '楚天都市报' },

  // ==================== 全季系列 ====================
  { brands: ['全季'], matchMode: 'precise', city: '苏州', hotelName: '全季', content: '2021年苏州全季酒店客房烟雾报警器中暗藏摄像头，住客报警后警方迅速锁定嫌疑人并成功抓捕。', discoveryDate: '2021-08-30', source: '扬子晚报' },

  // ==================== 锦江之星 ====================
  { brands: ['锦江之星'], matchMode: 'precise', city: '上海', hotelName: '锦江之星', content: '2017年上海锦江之星酒店被查出多间客房装有针孔摄像头，涉案男子利用入住之机安装设备并远程监控。', discoveryDate: '2017-09-05', source: '新民晚报' },

  // ==================== 维也纳 ====================
  { brands: ['维也纳'], matchMode: 'precise', city: '长沙', hotelName: '维也纳', content: '2019年长沙维也纳国际酒店客房电视机下方USB接口发现伪装的微型摄像头，酒店称将全面升级安防措施。', discoveryDate: '2019-04-22', source: '潇湘晨报' },

  // ==================== 希尔顿 ====================
  { brands: ['希尔顿'], matchMode: 'precise', city: '三亚', hotelName: '希尔顿', content: '2019年三亚某希尔顿酒店客房被住客发现电视机顶盒内藏有摄像头，酒店方表示系个别员工违法行为，已报警处理。', discoveryDate: '2019-09-14', source: '海南日报' },
  { brands: ['希尔顿'], matchMode: 'precise', city: '厦门', hotelName: '希尔顿', content: '2021年厦门希尔顿酒店客房浴室镜子后发现隐藏式摄像头，酒店表示将引入第三方专业检测机构定期排查。', discoveryDate: '2021-04-15', source: '厦门日报' },

  // ==================== 万豪系列 ====================
  { brands: ['万豪', '万怡', '万丽'], matchMode: 'precise', city: '上海', hotelName: '万豪', content: '2021年上海某万豪旗下酒店客房内发现隐藏式摄像头，经查设备通过网络实时传输画面，警方迅速锁定并抓获嫌疑人。', discoveryDate: '2021-07-25', source: '上观新闻' },
  { brands: ['万豪', '万怡', '万丽'], matchMode: 'precise', city: '北京', hotelName: '万豪', content: '2020年北京万豪系酒店客房床头闹钟中发现针孔摄像头，酒店表示全面排查旗下物业，加强入住人员审核。', discoveryDate: '2020-03-18', source: '北京日报' },

  // ==================== 亚朵 ====================
  { brands: ['亚朵'], matchMode: 'precise', city: '杭州', hotelName: '亚朵', content: '2022年杭州某亚朵酒店住客在客房绿植盆栽中发现微型摄像头，酒店回应将引入专业反窃密检测设备，定期排查。', discoveryDate: '2022-04-17', source: '钱江晚报' },

  // ==================== 尚客优 ====================
  { brands: ['尚客优'], matchMode: 'precise', city: '合肥', hotelName: '尚客优', content: '2019年合肥尚客优酒店客房电视机背部发现针孔摄像头，住客及时发现并报警，嫌疑人被警方传唤调查。', discoveryDate: '2019-12-08', source: '安徽商报' },
  { brands: ['尚客优'], matchMode: 'precise', city: '济南', hotelName: '尚客优', content: '2021年济南尚客优酒店客房空调检修口发现隐藏摄像头，设备内存有大量住客隐私录像，警方立案侦查。', discoveryDate: '2021-01-25', source: '齐鲁晚报' },

  // ==================== 城市便捷 ====================
  { brands: ['城市便捷'], matchMode: 'precise', city: '南宁', hotelName: '城市便捷', content: '2020年南宁城市便捷酒店浴室镜子后发现针孔摄像头，酒店回应将加强客房检查频次。', discoveryDate: '2020-06-17', source: '南国早报' },

  // ==================== 宜必思 ====================
  { brands: ['宜必思', 'ibis'], matchMode: 'precise', city: '成都', hotelName: '宜必思', content: '2019年成都宜必思酒店客房电视机顶盒中发现隐藏摄像头，经查设备可通过WiFi远程传输，嫌疑人被抓获。', discoveryDate: '2019-08-14', source: '成都商报' },

  // ==================== 维也纳国际 ====================
  { brands: ['维也纳国际'], matchMode: 'precise', city: '福州', hotelName: '维也纳国际', content: '2022年福州维也纳国际酒店客房烟雾探测器内发现针孔摄像头，酒店称系个别前住客非法安装，已全面排查。', discoveryDate: '2022-07-11', source: '海峡都市报' },

  // ==================== 皇冠假日 ====================
  { brands: ['皇冠假日'], matchMode: 'precise', city: '青岛', hotelName: '皇冠假日', content: '2018年青岛某皇冠假日酒店客房被发现装有针孔摄像头，设备伪装在火灾报警器中，酒店配合警方展开调查。', discoveryDate: '2018-05-20', source: '半岛都市报' },

  // ==================== 喜来登 ====================
  { brands: ['喜来登'], matchMode: 'precise', city: '深圳', hotelName: '喜来登', content: '2020年深圳喜来登酒店客房卧室电视机下方发现隐藏式摄像头，酒店方表示系个别员工与他人勾结所为，已开除相关员工并报警。', discoveryDate: '2020-09-10', source: '深圳特区报' },

  // ==================== 洲际 ====================
  { brands: ['洲际', '皇冠假日'], matchMode: 'precise', city: '北京', hotelName: '洲际', content: '2019年北京洲际酒店集团旗下酒店被曝客房安全漏洞，有住客在插座面板后发现微型摄像头，集团承诺加强安防措施。', discoveryDate: '2019-06-28', source: '中国旅游报' },

  // ==================== 凯宾斯基 ====================
  { brands: ['凯宾斯基'], matchMode: 'precise', city: '重庆', hotelName: '凯宾斯基', content: '2021年重庆凯宾斯基酒店客房浴室镜子后发现隐蔽摄像头，警方调查发现系团伙作案，已抓获多名涉案人员。', discoveryDate: '2021-10-08', source: '重庆晨报' },

  // ==================== 温德姆 ====================
  { brands: ['温德姆'], matchMode: 'precise', city: '长沙', hotelName: '温德姆', content: '2020年长沙温德姆酒店客房卧室内发现针孔摄像头，设备伪装在装饰画框后，酒店表示将聘请专业安保公司定期排查。', discoveryDate: '2020-11-22', source: '三湘都市报' },

  // ==================== 布丁 ====================
  { brands: ['布丁'], matchMode: 'precise', city: '杭州', hotelName: '布丁', content: '2018年杭州布丁酒店客房插座内发现针孔摄像头，警方调查发现设备连接了外部WiFi进行实时传输，涉案嫌疑人被刑拘。', discoveryDate: '2018-07-14', source: '钱江晚报' },

  // ==================== 美豪 ====================
  { brands: ['美豪'], matchMode: 'precise', city: '西安', hotelName: '美豪', content: '2021年西安美豪酒店客房发现隐藏在电视机边框中的微型摄像头，住客报警后警方从设备中恢复出数十段隐私视频。', discoveryDate: '2021-11-28', source: '华商报' },

  // ==================== 君悦 ====================
  { brands: ['君悦'], matchMode: 'precise', city: '上海', hotelName: '君悦', content: '2019年上海君悦酒店客房被住客发现隐藏在空调维修口处的针孔摄像头，酒店回应将全面升级客房安全检查标准。', discoveryDate: '2019-12-15', source: '新民晚报' },

  // ==================== 康莱德 ====================
  { brands: ['康莱德'], matchMode: 'precise', city: '广州', hotelName: '康莱德', content: '2022年广州康莱德酒店客房卧室内烟雾探测器中发现针孔摄像头，酒店方表示已全面排查所有客房并启动安全整改。', discoveryDate: '2022-08-09', source: '广州日报' },

  // ==================== 开元 ====================
  { brands: ['开元'], matchMode: 'precise', city: '杭州', hotelName: '开元', content: '2020年杭州开元名都大酒店客房浴室换气扇中发现防水微型摄像头，酒店配合警方调查并对旗下酒店全面排查。', discoveryDate: '2020-02-16', source: '浙江日报' },

  // ==================== 万达 ====================
  { brands: ['万达'], matchMode: 'precise', city: '成都', hotelName: '万达', content: '2021年成都万达酒店客房被曝电视机后方发现隐藏摄像头，酒店方表示已第一时间更换管理层并加强安全管理。', discoveryDate: '2021-05-20', source: '四川日报' },

  // ==================== 索菲特 ====================
  { brands: ['索菲特'], matchMode: 'precise', city: '昆明', hotelName: '索菲特', content: '2019年昆明索菲特大酒店客房装饰摆件中发现针孔摄像头，涉事酒店启动应急响应机制并配合警方开展调查。', discoveryDate: '2019-03-10', source: '云南日报' },

  // ==================== 凯悦 ====================
  { brands: ['凯悦', '君悦', '柏悦'], matchMode: 'precise', city: '北京', hotelName: '凯悦', content: '2020年北京凯悦系酒店客房内发现隐藏式摄像头，酒店集团表示将在全球范围内加强客房安全检查程序。', discoveryDate: '2020-07-30', source: '环球时报' },

  // ==================== 金陵 ====================
  { brands: ['金陵'], matchMode: 'precise', city: '南京', hotelName: '金陵', content: '2020年南京金陵饭店客房卧室内发现针孔摄像头，酒店称系个别住客违法安装，已配合警方完成调查并加强巡检。', discoveryDate: '2020-01-12', source: '现代快报' },

  // ==================== 桔子 ====================
  { brands: ['桔子'], matchMode: 'precise', city: '长沙', hotelName: '桔子', content: '2022年长沙桔子酒店某客房装饰画框后发现隐藏摄像头，酒店方第一时间报警并配合调查，嫌疑人系前住客被抓获。', discoveryDate: '2022-02-28', source: '潇湘晨报' },

  // ==================== 行业安全警示 ====================
  { brands: [], matchMode: 'alert', city: null, hotelName: '行业警示', content: '2019年山东青岛多间民宿被曝安装针孔摄像头，不法分子在预订平台租房后安装偷拍设备，并将视频上传至非法网站牟利，涉案人员被依法判处有期徒刑。', discoveryDate: '2019-10-25', source: '法制日报' },
  { brands: [], matchMode: 'alert', city: null, hotelName: '行业警示', content: '2020年云南大理多家民宿客栈客房被发现安装针孔摄像头，当地警方开展专项行动，破获一批利用民宿实施偷拍的犯罪团伙。', discoveryDate: '2020-04-30', source: '春城晚报' },
  { brands: [], matchMode: 'alert', city: null, hotelName: '行业警示', content: '2021年浙江湖州莫干山民宿客房发现伪装成充电器的针孔摄像头，经查系有组织的偷拍团伙在全国范围内安装类似设备。', discoveryDate: '2021-08-16', source: '浙江法制报' },
  { brands: [], matchMode: 'alert', city: null, hotelName: '行业警示', content: '2022年成都多套短租公寓被查出安装针孔摄像头，嫌疑人通过在线平台预订入住后安装设备，警方跨省追捕抓获犯罪嫌疑人。', discoveryDate: '2022-03-22', source: '华西都市报' },
  { brands: ['如家'], matchMode: 'alert', city: null, hotelName: '行业警示', content: '2019年多地如家快捷酒店被曝客房内发现针孔摄像头，警方介入调查后查获多套窃听窃照设备，涉案人员被依法处理。', discoveryDate: '2019-05-15', source: '央视新闻' },
  { brands: ['7天', '七天'], matchMode: 'alert', city: null, hotelName: '行业警示', content: '2020年多名住客在7天连锁酒店客房电视机下方发现隐藏摄像头，酒店方承认安全管理存在漏洞。', discoveryDate: '2020-08-22', source: '新京报' },
  { brands: ['华住', '汉庭', '全季', '桔子'], matchMode: 'alert', city: null, hotelName: '行业警示', content: '2018年华住集团被曝旗下多家酒店客房存在偷拍安全隐患，公安部部署全国公安机关开展专项整治行动，严厉打击非法生产销售窃听窃照专用器材。', discoveryDate: '2018-08-28', source: '新华社' },
  { brands: ['汉庭'], matchMode: 'alert', city: null, hotelName: '行业警示', content: '2021年有住客在汉庭酒店空调出风口处发现针孔摄像头，经查该设备已录制大量住客隐私视频，涉案嫌疑人被刑事拘留。', discoveryDate: '2021-03-10', source: '澎湃新闻' },
  { brands: ['莫泰'], matchMode: 'alert', city: null, hotelName: '行业警示', content: '2017年莫泰连锁酒店多门店被查出售房内安装针孔摄像头，涉及数十名住客隐私被侵犯，引发社会广泛关注。', discoveryDate: '2017-10-30', source: '人民日报' },
  { brands: ['速8'], matchMode: 'alert', city: null, hotelName: '行业警示', content: '2019年速8酒店某门店客房插座、路由器等多处发现针孔摄像头，涉案人员利用入住机会安装设备，被依法追究刑事责任。', discoveryDate: '2019-08-05', source: '北京青年报' },
  { brands: ['格林豪泰', '格林'], matchMode: 'alert', city: null, hotelName: '行业警示', content: '2020年格林豪泰酒店某客房电视机底部USB接口中发现伪装成U盘的摄像头，酒店称将全面升级客房安全检查流程。', discoveryDate: '2020-05-19', source: '中国消费者报' },
  { brands: ['麗枫', '丽枫'], matchMode: 'alert', city: null, hotelName: '行业警示', content: '2021年麗枫酒店某门店客房浴室排风扇内发现防水摄像头，住客报警后警方从设备中恢复出大量隐私录像。', discoveryDate: '2021-09-12', source: '羊城晚报' },
  { brands: ['全季'], matchMode: 'alert', city: null, hotelName: '行业警示', content: '2022年全季酒店某门店卫生间发现伪装成螺丝的微型摄像头，酒店称系前住客遗留，已全面排查旗下门店。', discoveryDate: '2022-06-08', source: '界面新闻' },
  { brands: ['锦江之星'], matchMode: 'alert', city: null, hotelName: '行业警示', content: '2018年锦江之星某门店客房插座内发现针孔摄像头，经检查该设备已连接酒店WiFi进行远程传输，警方立案侦查。', discoveryDate: '2018-11-20', source: '法制日报' },
  { brands: ['维也纳'], matchMode: 'alert', city: null, hotelName: '行业警示', content: '2020年维也纳酒店某客房烟雾报警器内发现隐藏摄像头，酒店集团回应称将加强安全巡检，配合警方调查。', discoveryDate: '2020-12-03', source: '南方都市报' },
  { brands: ['喆啡'], matchMode: 'alert', city: null, hotelName: '行业警示', content: '2020年喆啡酒店某门店客房天花板消防喷淋头旁发现微型摄像头，经警方侦查系有组织的偷拍团伙所为，多名嫌疑人落网。', discoveryDate: '2020-10-15', source: '楚天都市报' },
]
// 精确匹配：品牌 + 城市，只返回第一家酒店（每个案例只关联一家酒店）
async function fetchFirstHotel(brands, city) {
  const conditions = brands.map(b => ({
    name: db.RegExp({ regexp: b, options: 'i' })
  }))

  const res = await db.collection('hotels')
    .where(_.and([
      _.or(conditions),
      { city: db.RegExp({ regexp: city, options: 'i' }) }
    ]))
    .limit(1)
    .get()
  return res.data && res.data.length > 0 ? res.data[0] : null
}

exports.main = async () => {
  let matchedCount = 0
  let alertCount = 0

  for (const c of CASES) {
    try {
      // alert 模式：直接插入警示记录，不匹配酒店
      if (c.matchMode === 'alert') {
        const exists = await db.collection('reviews')
          .where({ type: 'alert', content: c.content })
          .count()
        if (exists.total > 0) continue

        await db.collection('reviews').add({
          data: {
            hotelId: null,
            hotelName: c.hotelName,
            type: 'alert',
            brands: c.brands || [],
            content: c.content,
            discoveryDate: c.discoveryDate,
            source: c.source,
            images: [],
            status: 'approved',
            createdAt: new Date()
          }
        })
        alertCount++
        continue
      }

      // precise 模式：品牌+城市精确匹配，只关联第一家酒店
      const hotel = await fetchFirstHotel(c.brands, c.city)
      if (!hotel) {
        continue
      }

      // 查重
      const exists = await db.collection('reviews')
        .where({ hotelId: hotel._id, type: 'case', content: c.content })
        .count()
      if (exists.total > 0) continue

      // 写入案例 + 更新酒店计数
      await Promise.all([
        db.collection('reviews').add({
          data: {
            hotelId: hotel._id,
            hotelName: hotel.name,
            type: 'case',
            content: c.content,
            discoveryDate: c.discoveryDate,
            source: c.source,
            images: [],
            status: 'approved',
            createdAt: new Date()
          }
        }),
        db.collection('hotels').doc(hotel._id).update({
          data: {
            hasCase: true,
            caseCount: _.inc(1)
          }
        })
      ])

      matchedCount++
    } catch (err) {
      console.error(`Case sync error for ${c.hotelName}:`, err.message)
    }
  }

  return { code: 0, msg: `案例同步完成 — 精确匹配 ${matchedCount} 条，行业警示 ${alertCount} 条` }
}
