/*
 * Navigation MVP data — intentionally separate from rendering code.
 * Building outlines remain sourced from canghai-spatial-data.js. Outdoor route
 * nodes are pedestrian-centreline anchors traced against the public satellite
 * reference and the user's Gaode overview screenshots on 2026-10-27. A
 * building footprint is never a route edge. Indoor facilities marked
 * `simulated: true` are interaction placeholders, not surveyed locations.
 */
const navigationData = {
  defaultStartNodeId: 'campus-hub',
  nodes: [
    { id: 'campus-hub', name: '教学区南侧步行节点', point: [22.52975, 113.93465] },
    { id: 'central-walk', name: '致理楼南侧步行道', point: [22.53025, 113.93470] },
    { id: 'civil-entry', name: '土木与交通工程学院入口', point: [22.52964, 113.93434] },
    { id: 'south-lane', name: '教学区南侧人行道', point: [22.52962, 113.93333] },
    { id: 'west-lane', name: '西侧林荫步道', point: [22.52985, 113.93130] },
    { id: 'zhixin-entry', name: '致信楼北侧入口', point: [22.53125, 113.93374] },
    { id: 'l1-south-walk', name: '致理楼 L1 南侧步道', point: [22.53043, 113.93496] },
    { id: 'zhili-l1-entry', name: '致理楼 L1 外侧入口', point: [22.53056, 113.93525] },
    { id: 'l2-south-walk', name: '致理楼 L2 南侧步道', point: [22.53105, 113.93470] },
    { id: 'zhili-l2-entry', name: '致理楼 L2 外侧入口', point: [22.53105, 113.93470] },
    { id: 'l7-south-walk', name: '致艺楼南侧步道', point: [22.53160, 113.93455] },
    { id: 'design-west-entry', name: '致艺楼 L7 西侧入口', point: [22.53170, 113.93455] },
    { id: 'design-east-entry', name: '致艺楼 L7 东侧入口', point: [22.53245, 113.93450] },
    { id: 'l3-east-walk', name: '致理楼 L3 东侧步道', point: [22.53170, 113.93600] },
    { id: 'zhili-l3-entry', name: '致理楼 L3 外侧入口', point: [22.53195, 113.93600] },
    { id: 'zhizhen-entry', name: '致真楼东侧入口', point: [22.53280, 113.93665] },
    { id: 'spring-dorm-entry', name: '春笛宿舍南侧入口（概略）', point: [22.534120, 113.935640] },
  ],
  edges: [
    { from: 'campus-hub', to: 'central-walk', distance: 62, via: [[22.52998, 113.93467]], kind: 'pedestrian' },
    { from: 'campus-hub', to: 'civil-entry', distance: 42, via: [[22.52968, 113.93448]], kind: 'pedestrian' },
    { from: 'civil-entry', to: 'south-lane', distance: 104, via: [[22.52962, 113.93388]], kind: 'pedestrian' },
    { from: 'south-lane', to: 'west-lane', distance: 338, via: [[22.52925, 113.93333], [22.52925, 113.93255], [22.52840, 113.93255], [22.52840, 113.93130]], kind: 'pedestrian' },
    { from: 'west-lane', to: 'zhixin-entry', distance: 356, via: [[22.53060, 113.93130], [22.53130, 113.93130], [22.53130, 113.93280]], kind: 'pedestrian' },
    { from: 'zhixin-entry', to: 'central-walk', distance: 182, via: [[22.53125, 113.93418], [22.53062, 113.93442]], kind: 'pedestrian' },
    { from: 'central-walk', to: 'l1-south-walk', distance: 38, via: [[22.53035, 113.93482]], kind: 'pedestrian' },
    { from: 'l1-south-walk', to: 'zhili-l1-entry', distance: 37, via: [[22.53044, 113.93515]], kind: 'pedestrian' },
    // Published campus guidance describes an L1–L3 skybridge. This is kept as
    // a distinct candidate connector so it can never be mistaken for open ground.
    { from: 'zhili-l1-entry', to: 'zhili-l3-entry', distance: 85, via: [[22.53120, 113.93548]], kind: 'covered-connector', verification: '公开资料描述，待现场复核', label: 'L1—L3 连廊' },
    { from: 'l3-east-walk', to: 'zhili-l3-entry', distance: 28, via: [[22.53182, 113.93600]], kind: 'pedestrian' },
    { from: 'l3-east-walk', to: 'zhizhen-entry', distance: 106, via: [[22.53225, 113.93662]], kind: 'pedestrian' },
    { from: 'central-walk', to: 'l7-south-walk', distance: 156, via: [[22.53055, 113.93450], [22.53110, 113.93450]], kind: 'pedestrian' },
    { from: 'l7-south-walk', to: 'l2-south-walk', distance: 76, via: [[22.53122, 113.93455], [22.53108, 113.93462]], kind: 'pedestrian' },
    { from: 'l7-south-walk', to: 'design-west-entry', distance: 14, via: [[22.53166, 113.93455]], kind: 'pedestrian' },
    { from: 'l7-south-walk', to: 'design-east-entry', distance: 136, via: [[22.53165, 113.93420], [22.53225, 113.93420]], kind: 'pedestrian' },
    { from: 'design-east-entry', to: 'zhizhen-entry', distance: 152, via: [[22.53295, 113.93465], [22.53300, 113.93550]], kind: 'pedestrian' },
    { from: 'zhizhen-entry', to: 'spring-dorm-entry', distance: 205, via: [[22.53318, 113.93626], [22.53372, 113.93608], [22.53400, 113.93572]], kind: 'pedestrian' },
  ],
  places: [
    { id: 'building-design-west', name: '致艺楼（西翼）', type: '教学楼', aliases: ['致艺楼', '设计教学楼', '西翼'], buildingId: 'design-west', nodeId: 'design-west-entry' },
    { id: 'building-design-east', name: '致艺楼（东翼）', type: '教学楼', aliases: ['致艺楼', '设计教学楼', '东翼'], buildingId: 'design-east', nodeId: 'design-east-entry' },
    { id: 'building-zhili-l1', name: '致理楼 L1', type: '教学楼', aliases: ['致理', 'l1'], buildingId: 'zhili-l1', nodeId: 'zhili-l1-entry' },
    { id: 'building-zhili-l2', name: '致理楼 L2', type: '教学楼', aliases: ['致理', 'l2'], buildingId: 'zhili-l2', nodeId: 'zhili-l2-entry' },
    { id: 'building-zhili-l3', name: '致理楼 L3', type: '教学楼', aliases: ['致理', 'l3'], buildingId: 'zhili-l3', nodeId: 'zhili-l3-entry' },
    { id: 'building-zhizhen', name: '致真楼', type: '教学楼', aliases: ['致真'], buildingId: 'zhizhen', nodeId: 'zhizhen-entry' },
    { id: 'building-zhixin', name: '致信楼', type: '教学楼', aliases: ['致信'], buildingId: 'zhixin', nodeId: 'zhixin-entry' },
    { id: 'building-civil', name: '土木工程学院', type: '教学楼', aliases: ['土木', '土木楼'], buildingId: 'civil-engineering', nodeId: 'civil-entry' },
    { id: 'building-spring-dorm', name: '春笛宿舍（概略）', type: '宿舍', aliases: ['春笛', '沧海宿舍', '宿舍区'], buildingId: 'spring-dorm', nodeId: 'spring-dorm-entry', simulated: true },

    { id: 'studio-design-west', name: '致艺楼西翼 Studio（示例）', type: '教室', floor: '2F', aliases: ['studio', '工作室'], buildingId: 'design-west', nodeId: 'design-west-entry', simulated: true },
    { id: 'rooms-design-west-2f', name: '致艺楼 2F 教室区 D201–D232（示意）', type: '教室范围', floor: '2F', aliases: ['D201', 'D214', 'D232', '201', '214', '232'], buildingId: 'design-west', nodeId: 'design-west-entry', simulated: true },
    { id: 'rooms-design-west-3f', name: '致艺楼 3F 教室区 D301–D338（示意）', type: '教室范围', floor: '3F', aliases: ['D301', 'D316', 'D338', '301', '316', '338'], buildingId: 'design-west', nodeId: 'design-west-entry', simulated: true },
    { id: 'toilet-design-west', name: '致艺楼西翼 1F 卫生间（模拟）', type: '卫生间', floor: '1F', aliases: ['厕所', '洗手间', 'wc'], buildingId: 'design-west', nodeId: 'design-west-entry', point: [22.53197, 113.93468], isFacility: true, simulated: true },
    { id: 'water-design-west', name: '致艺楼西翼 2F 茶水 / 饮水点（模拟）', type: '饮水点', floor: '2F', aliases: ['茶水间', '饮水机', '喝水'], buildingId: 'design-west', nodeId: 'design-west-entry', point: [22.53191, 113.93474], isFacility: true, simulated: true },
    { id: 'elevator-design-west', name: '致艺楼西翼 电梯（模拟）', type: '电梯', floor: '1F–10F', aliases: ['升降梯'], buildingId: 'design-west', nodeId: 'design-west-entry', point: [22.53204, 113.93469], isFacility: true, simulated: true },
    { id: 'toilet-zhili-l1', name: '致理楼 L1 1F 卫生间（模拟）', type: '卫生间', floor: '1F', aliases: ['厕所', '洗手间', 'wc'], buildingId: 'zhili-l1', nodeId: 'zhili-l1-entry', point: [22.53073, 113.93495], isFacility: true, simulated: true },
    { id: 'water-zhili-l1', name: '致理楼 L1 3F 饮水点（模拟）', type: '饮水点', floor: '3F', aliases: ['茶水间', '饮水机'], buildingId: 'zhili-l1', nodeId: 'zhili-l1-entry', point: [22.53069, 113.93488], isFacility: true, simulated: true },
    { id: 'toilet-zhizhen', name: '致真楼 1F 卫生间（模拟）', type: '卫生间', floor: '1F', aliases: ['厕所', '洗手间', 'wc'], buildingId: 'zhizhen', nodeId: 'zhizhen-entry', point: [22.53249, 113.93621], isFacility: true, simulated: true },
  ],
};

if (typeof module !== 'undefined') module.exports = { navigationData };
if (typeof window !== 'undefined') window.CanghaiNavigationData = navigationData;

