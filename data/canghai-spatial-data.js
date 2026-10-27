/*
 * Geometry basis
 * - Building footprints: OpenStreetMap way vertices fetched 2026-10-21.
 * - Spatial cross-check: user-supplied Gaode overview screenshot.
 * - Coordinates are [latitude, longitude] in WGS84. Do not mix these with
 *   the GCJ-02 coordinates shown by Gaode without converting them first.
 *
 * This is a massing-reference dataset, not a survey drawing.  `public-levels`
 * means the displayed height is proportional to the public building:levels tag;
 * `massing-estimate` is deliberately marked as an unmeasured volume.
 */

const osm = (wayId) => `https://www.openstreetmap.org/way/${wayId}`;

const campusData = {
  title: '深圳大学沧海校区（粤海校区南区）教学区 · 几何体三视图',
  orientation: 'north-up',
  coordinateSystem: 'WGS84',
  bounds: {
    minLat: 22.5278,
    maxLat: 22.5352,
    minLon: 113.9301,
    maxLon: 113.9409,
  },
  sources: [
    {
      label: '高德地图：深圳大学（沧海校区）POI 与用户提供的总览底图',
      url: 'https://amap.com/place/B0FFFWE63X',
      role: '校区范围、道路/建筑相对关系的人工交叉核对',
    },
    {
      label: 'OpenStreetMap building and highway way geometry',
      url: 'https://www.openstreetmap.org/',
      role: '可复查的建筑与道路顶点',
    },
  ],
  roads: [
    {
      id: 'baishi-road',
      name: '白石路',
      classification: 'external-primary',
      source: osm(328900405),
      line: [
        [22.5280544, 113.9304031], [22.52813, 113.9304407], [22.5285374, 113.930647],
        [22.5293362, 113.9310416], [22.5300078, 113.9314074], [22.53074, 113.931885],
        [22.531492, 113.9326108], [22.5322142, 113.933424], [22.5330588, 113.9344617],
        [22.5340161, 113.9356216], [22.5345845, 113.93641], [22.5351774, 113.9376388],
      ],
    },
    {
      id: 'gaoxin-south-10th-road',
      name: '高新南十道',
      classification: 'external-secondary',
      source: osm(689220808),
      line: [
        [22.5300883, 113.9407512], [22.5300583, 113.9404053], [22.529829, 113.9393365],
        [22.5294693, 113.9386388], [22.5289112, 113.9380768], [22.5282957, 113.9376391],
        [22.528061, 113.9372304], [22.5280072, 113.9365703], [22.5280311, 113.935231],
        [22.5280703, 113.9333822], [22.5281042, 113.9310016], [22.5281437, 113.9302605],
      ],
    },
    {
      id: 'stone-dock-square',
      name: '石头坞广场步行面',
      classification: 'pedestrian',
      source: osm(231665580),
      line: [
        [22.5346797, 113.9331049], [22.5347668, 113.9329452], [22.5347401, 113.9328272],
        [22.5346583, 113.9327511], [22.5342002, 113.9327449], [22.5341234, 113.9329943],
        [22.5342843, 113.9331283], [22.5346797, 113.9331049],
      ],
    },
    {
      id: 'l1-access-road',
      name: '理工楼组团内部车行支路',
      classification: 'internal-service',
      source: osm(246621644),
      line: [
        [22.5308667, 113.9342426], [22.5306418, 113.9342518],
        [22.5305802, 113.9342564], [22.5305158, 113.934262],
      ],
    },
    // The following centerlines are a schematic campus layer reconstructed
    // from the user-provided north-up map reference and the route graph.
    // They are deliberately not presented as surveyed road measurements.
    {
      id: 'teaching-central-avenue',
      name: '教学区主路',
      classification: 'internal-primary',
      source: 'schematic-reference',
      line: [
        [22.529000, 113.933700], [22.529480, 113.933770], [22.529980, 113.933950],
        [22.530280, 113.934220], [22.530650, 113.934650], [22.531040, 113.935010],
      ],
    },
    {
      id: 'zhili-design-promenade',
      name: '致理—致艺步行道',
      classification: 'pedestrian',
      source: 'schematic-reference',
      line: [
        [22.530280, 113.934220], [22.530760, 113.934990], [22.531400, 113.935350],
        [22.531820, 113.934710], [22.532450, 113.935080],
      ],
    },
    {
      id: 'teaching-east-loop',
      name: '东侧环路',
      classification: 'internal-service',
      source: 'schematic-reference',
      line: [
        [22.530900, 113.936000], [22.531560, 113.936160], [22.532420, 113.936170],
        [22.532930, 113.935760], [22.533050, 113.935080],
      ],
    },
    {
      id: 'design-court-walk',
      name: '设计教学楼庭院步道',
      classification: 'pedestrian',
      source: 'schematic-reference',
      line: [
        [22.531480, 113.934330], [22.531820, 113.934710], [22.532180, 113.934850],
        [22.532450, 113.935080], [22.532420, 113.936170],
      ],
    },
    {
      id: 'west-plaza-walk',
      name: '西侧广场步道',
      classification: 'pedestrian',
      source: 'schematic-reference',
      line: [
        [22.528920, 113.933150], [22.529300, 113.933560], [22.529550, 113.932720],
        [22.530280, 113.933820], [22.530620, 113.933440],
      ],
    },
    {
      id: 'north-courtyard-road',
      name: '北侧庭院支路',
      classification: 'internal-service',
      source: 'schematic-reference',
      line: [
        [22.532220, 113.933800], [22.532000, 113.934300], [22.532450, 113.935080],
        [22.532760, 113.935380], [22.533110, 113.935620],
      ],
    },
  ],
  mapSurfaces: [
    {
      id: 'stone-dock-plaza', name: '石头坞广场', kind: 'plaza',
      polygon: [[22.533030, 113.932670], [22.533400, 113.933000], [22.533210, 113.933690], [22.532760, 113.933520]],
    },
    {
      id: 'design-court', name: '致艺楼庭院', kind: 'courtyard',
      polygon: [[22.531770, 113.934700], [22.532210, 113.934830], [22.532490, 113.935160], [22.532050, 113.935430], [22.531650, 113.935080]],
    },
    {
      id: 'teaching-green-west', name: '西侧绿地', kind: 'green',
      polygon: [[22.528780, 113.932600], [22.530000, 113.932570], [22.530430, 113.933260], [22.529240, 113.933420]],
    },
    {
      id: 'east-garden', name: '东侧绿地', kind: 'green',
      polygon: [[22.530720, 113.935950], [22.532950, 113.935900], [22.533060, 113.936650], [22.530880, 113.936620]],
    },
  ],
  buildings: [
    {
      id: 'zhixin', name: '致信楼', heightUnits: 6, heightSource: 'public-levels',
      source: osm(231086125),
      footprint: [
        [22.5298932, 113.9331875], [22.5300939, 113.9331794], [22.5300828, 113.9326859],
        [22.5302215, 113.9325411], [22.5304049, 113.9327584], [22.5304792, 113.9330319],
        [22.530551, 113.9330078], [22.5305436, 113.9328335], [22.530689, 113.9329047],
        [22.5309359, 113.9330239], [22.53094, 113.9333914], [22.5309202, 113.9336059],
        [22.5311729, 113.9336059], [22.531158, 113.9329113], [22.530613, 113.9326511],
        [22.5302166, 113.932238], [22.5299566, 113.9325132], [22.5298821, 113.9325921],
        [22.5298932, 113.9331875],
      ],
    },
    {
      id: 'civil-engineering', name: '土木工程学院', heightUnits: 5, heightSource: 'public-levels',
      source: osm(231086366),
      footprint: [
        [22.5295803, 113.934249], [22.5294082, 113.9342506], [22.5294046, 113.9338036],
        [22.5293569, 113.9338041], [22.5293575, 113.9338848], [22.5289797, 113.9338884],
        [22.5289807, 113.9340193], [22.5288115, 113.9340209], [22.5288088, 113.9336851],
        [22.5289656, 113.9336836], [22.5289638, 113.9334633], [22.5294011, 113.933459],
        [22.5294022, 113.9335944], [22.529575, 113.9335928], [22.5295803, 113.934249],
      ],
    },
    {
      id: 'computer-software', name: '计算机与软件学院、电子科学与技术学院楼', heightUnits: 3, heightSource: 'public-levels',
      source: osm(319101983),
      footprint: [
        [22.5298238, 113.931922], [22.5296199, 113.9318088], [22.5289843, 113.9314508],
        [22.528827, 113.9314245], [22.5286564, 113.9315193], [22.5285714, 113.9317524],
        [22.5285728, 113.932415], [22.5295915, 113.9324125], [22.5298238, 113.931922],
      ],
    },
    {
      id: 'physics-optics', name: '物理与光电工程学院', heightUnits: 4, heightSource: 'massing-estimate',
      source: osm(319101984),
      footprint: [
        [22.5291101, 113.9326154], [22.5284762, 113.9326178], [22.5284783, 113.9332663],
        [22.5291123, 113.9332638], [22.5291101, 113.9326154],
      ],
    },
    {
      id: 'design-west', name: '致艺楼（西翼）', heightUnits: 10, heightSource: 'public-levels',
      source: osm(629940889),
      footprint: [
        [22.5321323, 113.934309], [22.5318987, 113.9345335], [22.531782, 113.9346456],
        [22.5317754, 113.9346552], [22.5318921, 113.9347938], [22.5319397, 113.9347682],
        [22.5320993, 113.9345892], [22.5322993, 113.9348266], [22.5324341, 113.9346904],
        [22.5321323, 113.934309],
      ],
    },
    {
      id: 'design-east', name: '致艺楼（东翼）', heightUnits: 10, heightSource: 'public-levels',
      source: osm(629940890),
      footprint: [
        [22.5324702, 113.9347369], [22.5328631, 113.9349965], [22.532868, 113.9354213],
        [22.5327643, 113.9353794], [22.5326906, 113.9354237], [22.5327063, 113.9353469],
        [22.5326868, 113.9350971], [22.532381, 113.9348952], [22.5324702, 113.9347369],
      ],
    },
    {
      id: 'zhili-l3', name: '致理楼L3', heightUnits: 13, heightSource: 'public-levels',
      source: osm(629940891),
      footprint: [
        [22.5318655, 113.9354287], [22.5319233, 113.9356655], [22.5313042, 113.9358427],
        [22.5308687, 113.9353351], [22.5309518, 113.9352515], [22.5310258, 113.9351771],
        [22.5313648, 113.9355721], [22.5318655, 113.9354287],
      ],
    },
    {
      id: 'zhizhen', name: '致真楼', heightUnits: 16, heightSource: 'public-levels',
      source: osm(629940892),
      footprint: [
        [22.5327465, 113.9362821], [22.5325983, 113.9361089], [22.5323068, 113.9357681],
        [22.532145, 113.9359303], [22.5325848, 113.9364443], [22.5327465, 113.9362821],
      ],
    },
    {
      id: 'zhili-l2', name: '致理楼L2', heightUnits: 5, heightSource: 'public-levels',
      source: osm(654873808),
      footprint: [
        [22.5315623, 113.9348083], [22.5316246, 113.9349226], [22.5317773, 113.9352292],
        [22.5318424, 113.9353426], [22.5316227, 113.9354761], [22.5314198, 113.9350849],
        [22.5312642, 113.9351794], [22.5313701, 113.9352804], [22.5312786, 113.9353362],
        [22.5311384, 113.9350666], [22.5315623, 113.9348083],
      ],
    },
    {
      id: 'zhili-l1', name: '致理楼L1', heightUnits: 17, heightSource: 'public-levels',
      source: osm(654873809),
      footprint: [
        [22.5306531, 113.9346444], [22.5308095, 113.9348317], [22.5309203, 113.9349646],
        [22.5308352, 113.9350478], [22.53076, 113.9351213], [22.5304928, 113.9348011],
        [22.5306531, 113.9346444],
      ],
    },
    {
      id: 'engineering-l4', name: '理工楼L4', heightUnits: 4, heightSource: 'public-levels',
      source: osm(984606892),
      footprint: [
        [22.5304577, 113.9335852], [22.5304607, 113.9341459], [22.5302559, 113.9341525],
        [22.5302551, 113.9335883], [22.5304577, 113.9335852],
      ],
    },
    {
      id: 'advanced-institute', name: '高等研究院', heightUnits: 7, heightSource: 'public-levels',
      source: osm(984606893),
      footprint: [
        [22.5301037, 113.9335948], [22.5299289, 113.9335957], [22.5299326, 113.9342951],
        [22.5302247, 113.9346506], [22.5303613, 113.9345142], [22.5301174, 113.9342372],
        [22.5301037, 113.9335948],
      ],
    },
    {
      // Approximate massing placed from the public Gaode overview: this is a
      // dormitory context landmark, not a measured or indoor-surveyed model.
      id: 'spring-dorm', name: '春笛宿舍', heightUnits: 17, heightSource: 'massing-estimate',
      source: 'Gaode overview cross-check · approximate dormitory massing',
      footprint: [
        [22.534420, 113.935120], [22.534420, 113.936170], [22.534120, 113.936170],
        [22.534120, 113.935120], [22.534420, 113.935120],
      ],
    },
  ],
};

if (typeof module !== 'undefined') {
  module.exports = { campusData };
}

if (typeof window !== 'undefined') {
  window.CanghaiCampusData = campusData;
}

