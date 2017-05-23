/**
	2017-4-14 yuicer
	undo:
		系统消息
		
	example:
		import chat from "src/chat"
		//文本,图片发送
		chat.send(index, type, content_url, chat_type, temp)
			index 发送目标序号
			type 发送类型，0为文本，1为图片，2为魔法表情，3为红包，4为礼物。
			content_url 发送内容，文本或url
			chat_type 聊天类型 0为角色说，1为本人说，2为剧情
			temp 0 普通消息 1 临时消息
			
		//魔法表情
		chat.send_magicimg(index,type)
			index 发送目标序号
			type 0 骰子 1猜拳
			
		//消息撤回，传参cmd_sender(a,b,c,d)
		a 系统消息类型	b msg所在conversation，c msg 的序列号，d 撤回发送的内容
		cmd_sender("msg_revoke",0,1,"chehui")
		
		//礼物这版本不做，只接收提示
		
		//红包当前版本不做，只接收提示	

	//通知
	好友通知：
		某某想加你为好友
		某某向你发起求婚
		某某向你发起离婚

	群通知
		某某申请加入某群 group_join (群主，管理员皮所属账户能收)
		某某邀请你加某群 group_invite
		某某退出某群 group_quit (群主，管理员皮所属账户能收)
		某群已将某某移出群 group_kick (被移出的皮所属的账户能收)
		某群将某某设置为管理员 admin_setting (被设置的皮所属账户能收)
		某群已取消某某管理员身份 admin_cancel (被取消的皮所属账户能收)
		某某已成为某群新群主 group_transfer (被设置的皮所属账户能收)

	消息
		某群管理员开启了全员禁言 group_silenced (通知类型，但在消息栏显示，只有其他管理员或群主能收到)
		某群管理员关闭了全员禁言 group_silenced	(通知类型，但在消息栏显示，同上)
		群主授予某某专属头衔 (txt)
		礼物消息 某某送给你一份礼物  (txt)
		
**/
import vm from 'src/main.js'
import MpIM from './mpIM/mpIM.js'
//import RongIM from './RongSDK_helper/RongIM'
// import CmdHandler from './CmdHandler'
import Extra from './data_structure/Extra'
import GroupExtra from './data_structure/GroupExtra'
import Msg from './data_structure/Msg'
import Conversation from './data_structure/Conversation'
// import uploadimg from './RongSDK_helper/uploadimg'
var mpIM = new MpIM();
console.log(mpIM.init)
//对外暴露的唯一对象。
var chat = {
	//获取群数据
	getgroup:function(){
		var allgroup;
		//查看所有群信息
		vm.$http({
				method: 'get',
				url: 'http://test.mrpyq.com/api/group/groups_by_me',
				params: {
					'access_token': localStorage.getItem('access_token'),
				},
				emulateJSON: true,
			}).then(
				res => {
					if (res.body.error) {
						vm.$store.state.f_error(vm.$store.state, res.body.error);
					}
					else if (res.body.items) {
						vm.$store.state.messages.grouplist = res.body.items;
						allgroup = res.body.items;
						//console.log(res.body);
						//获取所有群详细
						var details=[];
						if (allgroup) {
							for (var i = 0,l = allgroup.length;i < l;i++) {
								//对每个群的群id获取其群详细
								vm.$http({
									method: 'get',
									url: 'http://test.mrpyq.com/api/group/details',
									params: {
										'access_token': localStorage.getItem('access_token'),
										'id': allgroup[i]._id
									},
									emulateJSON: true,
								}).then(
									res => {
										if (res.body.error) {
											vm.$store.state.f_error(vm.$store.state, res.body.error);
										}
										else if (res.body.group) {
											details.push(res.body.group);
											if(details.length==vm.$store.state.messages.grouplist.length){
												vm.$store.state.messages.groupsDetail=details;
												vm.$store.state.group_switch=true;
											}
										}
									},
									res => {//500报错
										vm.$store.state.f_error(vm.$store.state, "服务器正在开小差。。。");
								})
							}
						}
					}
				},
				res => {//500报错
					vm.$store.state.f_error(vm.$store.state, "服务器正在开小差。。。");
			})
	},
	deviceInfo:{
		token:'',
		type:'WEB',
		mac:''
	},
	login:function (deviceid) {
		//AppKey
		//Debug:  x18ywvqf8mcmc
		//Release:  x4vkb1qpvszsk
		this.deviceInfo.token=localStorage.getItem('access_token');
		this.mac=deviceid;
		mpIM.init(this.deviceInfo);
		// RongIMLib.RongIMEmoji.init();
		this.getgroup();
	},
	conversationExist: function (meId, otherId, con, meno, otherno) {
		var flag = false;
		//判断该会话是否存在
		if (otherno) { //otherno存在，为私聊情况
			for (var i = 0; i < con.length; i++) {
				if (meId == con[i].me.id && meno == con[i].me.no && otherId == con[i].other.id && otherno == con[i].other.no) {
					flag = true;
					break;
				}
			}
			if (flag)
				return i;
		} else { //为群聊情况
			for (var i = 0; i < con.length; i++) {
				if (meId == con[i].me.id && meno == con[i].me.no && otherId == con[i].other.id) {
					flag = true;
					break;
				}
			}
			if (flag)
				return i;
		}
	},
	// start: function (info,local){
	// 	var con = vm.$store.state.chat.conversation;
	// 	var me = {},
	// 		other = {},
	// 		group_details={};
	// 	var conExist; //标识会话是否在会话数组中存在，在的话为对应索引index,不在的话为undefined
	// 	// var type; //标识会话类型，1私聊，3群聊
	// 	var conversation; //自定义conversation
	// 	var sendIsMe;
	// 	if(local){
	// 		if(info.description){
	// 			//群聊
	// 			me.id=vm.$store.state.current_user._id;
	// 			me.no=vm.$store.state.current_user.no;
	// 			other.id=info._id;
	// 			other.no=info.no；
	// 		}else{
	// 			//私聊
	// 			me.id=vm.$store.state.current_user._id;
	// 			me.no=vm.$store.state.current_user.no;
	// 			other.id=info.user._id;
	// 			other.no=info.no；
	// 		}
	// 		//本地发起会话
	// 	}else{
	// 		//接受会话
	// 		if (info.me) {
	// 			me.id = info.sender_id;
	// 			me.no = info.sender_id;
	// 			other.id = info.target_id;
	// 			other.no = info.target_no;
	// 		} else {
	// 			me.id = info.target_id;
	// 			me.no = info.target_no;
	// 			other.id = info.sender_id;
	// 			other.no = info.sender_no;
	// 		}
	// 	}
	// 	//先判断收发类型
	// 	//if (isreseive){
	// 	//var extra = JSON.parse(info.content.extra);
	// 	//收消息情况下，判断会话类型
	// 	if (!info.target_type) { //私聊
	// 		//判断发消息的人是否就是本人, 判断发送方的deviceId是否与当前账户的deviceId相同(该情况出现在多端登录时)
	// 		// console.log("***********检查current_user对象");
	// 		//console.log(vm.$store.state.current_user.device._id);

	// 		//sendIsMe = (info.senderUserId == vm.$store.state.current_user.device._id);
	// 		console.log('收私聊消息时是否是本人发:', info.me);
	// 		console.log("当前皮ID为:");
	// 		console.log(vm.$store.state.current_user._id);
	// 		//判断该会话是否存在
	// 		conExist = this.conversationExist(me.id, other.id, con, me.no, other.no);
	// 		if (conExist!=undefined){//
	// 			//显示消息提示
	// 			vm.$store.state.message_window[conExist].show=1;
	// 			return conExist;
	// 		}
	// 		else{
	// 			if (info.me) {
	// 				me.headimg = info.sender_head_img;
	// 				me.name = info.sender_name;
	// 				other.headimg = info.chat_current_head_img;
	// 				other.name = info.chat_current_name;
	// 			} else {
	// 				other.headimg = info.sender_head_img;
	// 				other.name = info.sender_name;
	// 				me.headimg = info.chat_current_head_img;
	// 				me.name = info.chat_current_name;
	// 			}
	// 		}
	// 		//产生会话
	// 		conversation = new Conversation(me, other);

	// 	}else if (info.target_type == 1) { //群聊
	// 		if(vm.$store.state.group_switch){
	// 			//console.log(vm.$store.state.messages.grouplist)
	// 			var groupList = vm.$store.state.messages.grouplist;
	// 			//console.log(groupList);
	// 			var currPi;
	// 			//遍历用户的所有群信息，找到和收到的群消息对应的群
	// 			for (var gindex = 0, glength = groupList.length; gindex < glength; gindex++) {
	// 				if (info.target_id == groupList[gindex]._id) {
	// 					//找到后取该群中对应的当前皮信息
	// 					currPi = groupList[gindex].member;
	// 					me.id = currPi._id;
	// 					me.no = currPi.no;
	// 					break;
	// 				}
	// 			}
	// 			/*me.id = extra.selfId;
	// 			me.no = extra.selfNo;*/
	// 			other.id = info.target_id;
	// 			//判断该会话是否存在
	// 			conExist = this.conversationExist(me.id, other.id, con, me.no);
	// 			console.log(conExist + '***************');
	// 			if (conExist!=undefined){
	// 				vm.$store.state.message_window[conExist].show=1;
	// 				return conExist;
	// 			}
	// 			else {
	// 				//console.log(currPi);
	// 				me.headimg = currPi.headimg;
	// 				me.name = currPi.name;
	// 				other.headimg = info.chat_current_head_img;
	// 				other.name = info.chat_current_name;
	// 				other.no = info.target_no;
	// 				// other.deviceid = info.targetId;
	// 				//添加
	// 			}
	// 			conversation = new Conversation(me, other);
	// 			conversation.set_group(true); //conversation的isGroup为true
	// 			var selfTitle;
	// 			console.log(conversation)
	// 			switch (currPi.group_member_type) {
	// 				case 10:selfTitle = "管理员";break;
	// 				case 20:selfTitle = "群主";break;
	// 				default:selfTitle = "";break;
	// 			}
	// 			//设置群头衔
	// 			conversation.set_title(selfTitle, currPi.group_member_type);
	// 			//
	// 			//设置会话禁言状态,取当前会话对应的群组的禁言状态进行设置
	// 			this.setSilenced(conversation);

	// 			for(var i=0;i<vm.$store.state.messages.grouplist.length;i++){
	// 				if(other.id==vm.$store.state.messages.grouplist[i]._id){
	// 					group_details=vm.$store.state.messages.grouplist[i];
	// 					break;
	// 				}
	// 			}
	// 		}else{
	// 			var th=this;
	// 			var time=setInterval(function(){
	// 				if(vm.$store.state.group_switch){
	// 					th.receive(info);
	// 					clearInterval(time);
	// 				}
	// 			},300)
	// 			return conExist;
	// 		}
	// 	}
	// 	conversation.unreadCount = 0;//初始化未读消息数目为0
	// 	con.push(conversation);	
	// 	console.log(conversation,conExist);
	// 	// if(conversation && isreseive){
	// 	// 	if(!conversation.isGroup){
	// 	// 		vm.$store.state.openfriend(vm.$store.state,other.id,other,chat);
	// 	// 	}else{
	// 	// 		vm.$store.state.opengroup(vm.$store.state,group_details._id,group_details,chat);
	// 	// 	}
	// 	// }
	// 	console.log('会话数组:');
	// 	console.log(con);
	// 	return (con.length - 1);//创建新对话后返回对话数组最后一个索引值，此处需要修正
	// },
	start: function (info, isreseive){
		var con = vm.$store.state.chat.conversation;
		var me = {},
			other = {},
			group_details={};
		var conExist; //标识会话是否在会话数组中存在，在的话为对应索引index,不在的话为undefined
		var type; //标识会话类型，1私聊，3群聊
		var conversation; //自定义conversation
		//先判断收发类型
		if (isreseive){
			//收消息情况下，判断会话类型
			if (!info.target_type) { //私聊
				//判断发消息的人是否就是本人, 判断发送方的deviceId是否与当前账户的deviceId相同(该情况出现在多端登录时)
				// console.log("***********检查current_user对象");
				//console.log(vm.$store.state.current_user.device._id);

				//sendIsMe = (info.senderUserId == vm.$store.state.current_user.device._id);
				console.log('收私聊消息时是否是本人发:', info.me);
				console.log("当前皮ID为:");
				console.log(vm.$store.state.current_user._id);
				if (info.me) {
					me.id = info.sender_id;
					me.no = info.sender_id;
					other.id = info.target_id;
					other.no = info.target_no;
				} else {
					me.id = info.target_id;
					me.no = info.target_no;
					other.id = info.sender_id;
					other.no = info.sender_no;
				}
				//判断该会话是否存在
				conExist = this.conversationExist(me.id, other.id, con, me.no, other.no);
				console.log(info)
				if (conExist!=undefined){//
					//显示消息提示
					//vm.$store.state.message_window[conExist].show=1;
					return conExist;
				}else{
					if (info.me) {
						me.headimg = info.sender_head_img;
						me.name = info.sender_name;
						other.headimg = info.chat_current_head_img;
						other.name = info.chat_current_name;
					} else {
						other.headimg = info.sender_head_img;
						other.name = info.sender_name;
						me.headimg = info.chat_current_head_img;
						me.name = info.chat_current_name;
					}
				}
				//产生会话
				conversation = new Conversation(me, other);
			}else if (info.target_type == 1) { //群聊
				if(vm.$store.state.group_switch){
					//console.log(vm.$store.state.messages.grouplist)
					var groupList = vm.$store.state.messages.grouplist;
					//console.log(groupList);
					var currPi;
					//遍历用户的所有群信息，找到和收到的群消息对应的群
					for (var gindex = 0, glength = groupList.length; gindex < glength; gindex++) {
						if (info.target_id == groupList[gindex]._id) {
							//找到后取该群中对应的当前皮信息
							currPi = groupList[gindex].member;
							me.id = currPi._id;
							me.no = currPi.no;
							break;
						}
					}
					/*me.id = extra.selfId;
					me.no = extra.selfNo;*/
					other.id = info.target_id;
					//判断该会话是否存在
					conExist = this.conversationExist(me.id, other.id, con, me.no);
					console.log(conExist + '***************');
					if (conExist!=undefined){
						vm.$store.state.message_window[conExist].show=1;
						return conExist;
					}
					else {
						//console.log(currPi);
						me.headimg = currPi.headimg;
						me.name = currPi.name;
						other.headimg = info.chat_current_head_img;
						other.name = info.chat_current_name;
						other.no = info.target_no;
						// other.deviceid = info.targetId;
						//添加
					}
					conversation = new Conversation(me, other);
					conversation.set_group(true); //conversation的isGroup为true
					var selfTitle;
					console.log(conversation)
					switch (currPi.group_member_type) {
						case 10:selfTitle = "管理员";break;
						case 20:selfTitle = "群主";break;
						default:selfTitle = "";break;
					}
					//设置群头衔
					conversation.set_title(selfTitle, currPi.group_member_type);
					//
					//设置会话禁言状态,取当前会话对应的群组的禁言状态进行设置
					this.setSilenced(conversation);

					for(var i=0;i<vm.$store.state.messages.grouplist.length;i++){
						if(other.id==vm.$store.state.messages.grouplist[i]._id){
							group_details=vm.$store.state.messages.grouplist[i];
							break;
						}
					}
				}else{
					var th=this;
					var time=setInterval(function(){
						if(vm.$store.state.group_switch){
							th.receive(info);
							clearInterval(time);
						}
					},300)
					return conExist;
				}
			}
			//type = info.conversationType;
		} else {
			//发消息情况下，判断会话类型
			console.log(info)
			if (!info.description) { //私聊
				type = 1;
				me.id = vm.$store.state.current_user._id;
				me.no = vm.$store.state.current_user.no;
				other.id = info.user._id;
				other.no = info.no;
				conExist = this.conversationExist(me.id, other.id, con, me.no, other.no);
				if (!isNaN(conExist))
					return conExist;
				else {
					me.headimg = vm.$store.state.current_user.headimg;
					me.name = vm.$store.state.current_user.name;
					//me.no = vm.$store.state.current_user.no;
					other.headimg = info.headimg;
					other.name = info.name;
					//other.no = info.no;
					other.deviceid = info.device._id;
				}
				conversation = new Conversation(me, other);
			} else { //群聊
				//
				type = 3;
				me.id = info.member._id;
				me.no = info.member.no;
				other.id = info._id;
				conExist = this.conversationExist(me.id, other.id, con, me.no);
				console.log(conExist)
				if (!isNaN(conExist))
					return conExist;
				else {
					me.headimg = info.member.headimg;
					me.name = info.member.name;
					//me.no = info.member.no;
					other.headimg = info.headimg;
					other.name = info.name;
					other.no = info.no;
					other.deviceid = info._id;
				}
				conversation = new Conversation(me, other);
				conversation.set_group(true);

				//设置会话群禁言状态,取当前会话对应的群组的禁言状态进行设置
				// console.log('我的当前身份类型:',this.checkMemberType(other.id, me.id))
				// if (this.checkMemberType(other.id, me.id) == 1) {//我的当前身份为普通用户
				// 	if (this.findGroupDetail(other.id).silenced) {//群处于禁言状态
				// 		conversation.set_silenced(1);
				// 	} else {
				// 		conversation.set_silenced(0);
				// 	}
				// } else {
				// 	conversation.set_silenced(0);
				// }
				// conversation.set_silenced(this.findGroupDetail(other.id).silenced);	

				this.setSilenced(conversation);

				console.log(info.member.group_member_type);
				switch (info.member.group_member_type) {
					case 1:
						conversation.set_title("", 1);
						break;
					case 10:
						conversation.set_title("管理员", 10);
						break;
					case 20:
						conversation.set_title("群主", 20);
						break;
				}
			}
		}

		conversation.unreadCount = 0;//初始化未读消息数目为0
		con.push(conversation);	
		console.log(conversation,conExist);
		if(conversation && isreseive){
			if(!conversation.isGroup){
				vm.$store.state.openfriend(vm.$store.state,other.id,other,chat);
			}else{
				vm.$store.state.opengroup(vm.$store.state,group_details._id,group_details,chat);
			}
		}
		console.log('会话数组:');
		console.log(con);
		return (con.length - 1);//创建新对话后返回对话数组最后一个索引值，此处需要修正
	},
	send: function (index, type, content_url, chat_type, temp, extra_content, atList) {
		//构造msg对象并存储
		if (type == 1) {
			var file = content_url.file;
			content_url = content_url.url;
		}
		var time = new Date().getTime(),
			msg = new Msg(index, type, content_url, chat_type, temp, time, extra_content),extra,body;
			 // sender_id:'551d812efbe78e6ec27b1049',
		  //   sender_no:230,
		  //   sender_name:'123',
		  //   sender_head_img:'http://7x2wk4.com2.z0.glb.qiniucdn.com/FjSVAW5sjDmeort4fXB6OZ5JLlJ7-head',
		  //   msg_type:0,
		  //   msg_time:new Date().getTime(),
		  //   msg_content_type:1,
		  //   msg_content:{
		  //     speakType:0,   
		  //     content:mp.toBase64(inp.value),
		  //     atList:[],      
		  //     temp:0
		  //   }
		  //   target_type:0,
		  //   target_id:'550d6af6fbe78e1ec58b95ca',
		  //   target_no:219
			body={
				sender_id:vm.$store.state.chat.conversation[index].me.id,
			    sender_no:vm.$store.state.chat.conversation[index].me.no,
			    sender_name:vm.$store.state.chat.conversation[index].me.name,
			    sender_head_img:vm.$store.state.chat.conversation[index].me.headimg,
			    msg_type:0,
			    msg_time:new Date().getTime(),
			    msg_content_type:1,
			    msg_content:mpIM.toBase64(JSON.stringify({
			      speakType:chat_type,   
			      content:content_url,
			      atList:[],      
			      temp:temp
			    })),
			    target_type:type,
			    target_id:vm.$store.state.chat.conversation[index].other.id,
			    target_no:vm.$store.state.chat.conversation[index].other.no
			}
// <<<<<<< HEAD
// 			extra,
// 			conversationType;
// 		if (vm.$store.state.chat.conversation[index].isGroup) {	
// 			conversationType = 3;
			
			//msg.set_atList();//消息中加入@马化腾
// =======
		if (vm.$store.state.chat.conversation[index].isGroup) {
			if (atList) {//如果有atList
				msg.set_atList(atList);
			}
			extra = new GroupExtra(index, atList, msg.content_type, msg.chat_type, extra_content);
		}
		else
			extra = new Extra(index, msg.content_type, msg.chat_type, temp, extra_content);

		//自己发的消息
		msg.set_from();
		//img
		if (type == 1) {
			//回调中取到url后将已存的本地url换掉，再发送融云消息
			function callback(url_) {
				if (url_.match('jpg') || url_.match('png')) {
					msg.url = url_;
					msg.set_send_success();
					Rong.sendMessageImg(JSON.stringify(extra), msg.url, vm.$store.state.chat.conversation[index], msg);
				}
			}
			uploadimg(file, callback);
		}
		//txt
		else
			mpIM.send(body)
			//Rong.sendMessageTxt(JSON.stringify(extra), msg.content, vm.$store.state.chat.conversation[index], msg);
	},
	send_img: function (e,index) {
		var file = e.target.files[0];
		if (file) {
			if (file.name.slice(-4) == '.png' || file.name.slice(-4) == '.jpg') {
				//取本地图片地址
				var node = e.target;
				var imgURL = '';
				try {
					var file = null;
					if (node.files && node.files[0]) {
						file = node.files[0];
					} else if (node.files && node.files.item(0)) {
						file = node.files.item(0);
					}
					//Firefox 因安全性问题已无法直接通过input[file].value 获取完整的文件路径  
					try {
						imgURL = file.getAsDataURL();
					} catch (e) {
						imgURL = window.URL.createObjectURL(file);
					}
				} catch (e) {
					if (node.files && node.files[0]) {
						var reader = new FileReader();
						reader.onload = function (e) {
							imgURL = e.target.result;
						};
						reader.readAsDataURL(node.files[0]);
					}
				}
				var file_ = {
					url: imgURL,
					file: file
				}
				chat.send(index, 1, file_, 0, 0);
			} else
				this.$store.state.f_error(this.$store.state, "当前仅支持传送png,jpg格式");
		}
	},
	//根据以后接口改参数，礼物类型等等
	send_gift: function (index) {
		var gift = this.get_gift();
		this.send(index, 4, gift.name, 0, 0, gift);
	},

	send_magicimg: function (index, type) {
		//0骰子1猜拳
		var magicimg = this.get_magicimg(type)
		this.send(index, 2, magicimg.magicPicDesc, 0, 0, magicimg);
	},

	//找到群详细数组中指定群ID的群详细项
	findGroupDetail: function (groupId) {
		var groupDetail;
		var groupsDetail = vm.$store.state.messages.groupsDetail;
		console.log("当前账号所有群的群详细");
		console.log(groupsDetail);
		for (var i = 0,l = groupsDetail.length;i < l;i++) {
			if (groupId == groupsDetail[i]._id) {
				groupDetail = groupsDetail[i];
				break;
			}
		}
		return groupDetail;
	},

	//根据群id和皮id判断此皮在群中的身份
	checkMemberType: function (groupId, userId) {
		//根据groupId找到对应群的群详细
		var memberType = 1;
		// var groupDetail;
		// var groupsDetail = vm.$store.state.messages.groupsDetail;
		// console.log("当前账号所有群的群详细");
		// console.log(groupsDetail);
		// for (var i = 0,l = groupsDetail.length;i < l;i++) {
		// 	if (groupId == groupsDetail[i]._id) {
		// 		groupDetail = groupsDetail[i];
		// 		break;
		// 	}
		// }
		// console.log("发言人所属群的群详细");
		var groupDetail = this.findGroupDetail(groupId);
		console.log(groupDetail);
		if (groupDetail) {
			//先判断此皮是否是群主
			if (userId == groupDetail.owner._id) {
				memberType = 20;
			}
			//再判断此皮是否属于管理员组
			for (var j = 0,jl = groupDetail.admins.length;j < jl;j++) {
				if (groupDetail.admins[j]._id == userId) {
					memberType = 10;
					break;
				}
			}
		}
		return memberType;
	},

	setSilenced: function (con, status) {
		var conversation = con;
		var otherId = con.other.id;
		var meId = con.me.id;
		//设置会话禁言状态,取当前会话对应的群组的禁言状态进行设置
		console.log('我的当前身份类型:',this.checkMemberType(otherId, meId))
		console.log("status为:", status);
		if (status === undefined) {//status不存在时，属于取群详细设置会话禁言的情形
			if (this.checkMemberType(otherId, meId) == 1) {//我的当前身份为普通用户
				if (this.findGroupDetail(otherId).silenced) {//群处于禁言状态
					conversation.set_silenced(1);
				} else {
					conversation.set_silenced(0);
				}
			} else {//群主，管理员不受影响
				conversation.set_silenced(0);
			}
		} else { //status存在时，属于消息通知的情形
			if (this.checkMemberType(otherId, meId) == 1) {//我的当前身份为普通用户

				// if (status) {//群处于禁言状态
				// 	conversation.set_silenced(1);
				// } else {
				// 	conversation.set_silenced(0);
				// }
				conversation.set_silenced(status);
			} else {//群主，管理员不受影响
				conversation.set_silenced(0);
			}
		}
		
	},
	//接收消息
	//消息体：
	//////******************属性为零的属性会被省略******************//////
	/*string target_id = 2;
    int64 target_no = 3;
    string sender_id = 4;
    int64 sender_no = 5;
    string sender_name = 6;
    string sender_head_img = 7;
	TargetType target_type:{
		PRIVATE = 0;
	    GROUP = 1;
	    CHATROOM = 2;
	}
    MsgType msg_type:
    {
	    CHAT = 0;
	    CMD = 1;
	    SYSTEM = 2;
	}
    int64 msg_time:new Date().getTime();
    int32 msg_content_type：
    {
    	SCMessageContentTypeText,0
	    SCMessageContentTypeImage,1
	    魔法表情
	    SCMessageContentTypeAnimation,2
	    红包
	    SCMessageContentTypeEnvelope,3
	    SCMessageContentTypeGif,4
	}
    bytes msg_content：
    {
	    "speakType"         :SCMessageSpeakType,
	    "content"           :String 原rongmsgcontent的exta中的content字段 可能是json字符串,
	    "atList"            :Array, 
	    "defaultContent"    :String(新的消息类型，解析不了的时候，默认是SCMessageContentTypeText类型，这个类型默认从这个字段读取content)原rongmsgcontent的content字段，用作兼容,
	    "temp"              :Int
	}*/
	receivetext: function (message){
		//首先构建一条msg
		// this.content
		// this.content_type
		// this.url
		// this.chat_type
		// this.temp
		// this.time
		// this.revoke
		// this.extra_content
		// this.speaker
		// this.revoke
		// this.revoke_user
		// this.atList
		var index = this.start(message,1);
		console.log('index='+index);
		if(index===undefined){
			return;
		}
		var msg=new Msg(index, message.msg_content_type, message.msg_content.content, message.msg_content.speakType, message.msg_content.temp, message.msg_time);
		// var receiveType = extra.contentType;//收到的消息的content类型
		// if (receiveType == 'gift_message') {
		// 	//礼物消息做特殊处理，需要存到好友通知数组中,不建立会话
		// 	var gift_cmd = {
		// 		name: receiveType,
		// 		data: extra
		// 	}
		// 	vm.$store.state.chat.cmd_msg.friendCmd.unshift(gift_cmd);
		// 	//礼物消息不去重，每次收到消息通知就使cmd的count加1
		// 	CmdHandler.cmd_count_add();
		// 	console.log(vm.$store.state.chat.cmd_msg);
		// 	return;
		// }

		// var	index = this.start(message, true,type);
		
		// var contentType;//需要存的contentType
		// console.log("index为*******************", index);
		// // console.log(index);
		// if(index!=undefined){
			
		// 	if (type == 1) {//融云目前发过来有txt和img两种消息，1为img,0为txt
		// 		var content_url = message.content.imageUri;
		// 		contentType = 1;
		// 	}
		// 	else {//txt情况下再分为普通文本，魔法表情，红包，礼物
		// 		if (receiveType == 'TXT') {
		// 			contentType = 0;
		// 		} else if (receiveType == 'REDPACK') {
		// 			contentType = 3;
		// 		} else if (receiveType == 'MAGIC_PIC') {
		// 			contentType = 2;
		// 		}
		// 		// } else if (receiveType == 'gift_message') {
		// 		// 	//礼物消息做特殊处理，需要存到好友通知数组中
		// 		// 	var gift_cmd = {
		// 		// 		name: receiveType,
		// 		// 		data: extra
		// 		// 	}
		// 		// 	vm.$store.state.chat.cmd_msg.friendCmd.push(gift_cmd);
		// 		// 	return;
		// 		// }
		// 		var content_url = message.content.content;
		// 	}
		// 	if (extra.content)
		// 		var extra_content = extra.content;
		// 	// console.log(extra.customType);


		// 	if (extra.customType == "MEMBER")
		// 		var chat_type = 0;
		// 	else if (extra.customType == "SELF")
		// 		var chat_type = 1;
		// 	else if (extra.customType == "DESCRIPTION")
		// 		var chat_type = 2;
		// 	else if (extra.customType == "SYSTEM")
		// 		var chat_type = 3;

		// 	//
		// 	var temp = extra.temp,
		// 		time = message.receivedTime,
		// 		msg = new Msg(index, contentType, content_url, chat_type, temp, time, extra_content);




		// 	//判断消息类型
		// 	// if (message.conversationType == 1) {//为私聊会话消息, 需要判断多端登录
		// 	// 	if (message.senderUserId == vm.$store.state.current_user.device._id) {
		// 	// 		msg.set_from();
		// 	// 	}
		// 	// }

		// 	if (message.conversationType == 3) {//为群会话消息，需要在msg中添加发言人信息
		// 		var speaker = {
		// 			speakerName: extra.selfName,
		// 			speakerHeadimg: extra.selfHeadimg,
		// 			speakerId: extra.selfId,
		// 			speakerNo: extra.selfNo,
		// 			speakerTitle: extra.selfTitle,
		// 		}
		// 		speaker.memberType = this.checkMemberType(extra.groupId,extra.selfId);
		// 		msg.set_from(speaker);
		// 	}

		// 	//群聊私聊都需要判断是否有多端登录情况
		// 	if (message.senderUserId == vm.$store.state.current_user.device._id) {
		// 		msg.set_from();
		// 	}

		// 	//判断消息是否已读
		// 	if (!vm.$store.state.unread_msg(vm.$store.state.chat.conversation[index].other.id,vm.$store.state)) {//消息未读
		// 		vm.$store.state.chat.conversation[index].set_unreadCount();//未读消息数目加1
		// 		console.log("未读消息数目:");
		// 		console.log(vm.$store.state.chat.conversation[index].unreadCount);
		// 	}

		// 	//对收到的消息设置uid
		// 	msg.set_uid(message.messageUId);
		// 	console.log("收到消息后打印当前会话：");
		// 	console.log(vm.$store.state.chat.conversation[index]);
		// }
	},
	//发通知消息
	cmd_sender: function () {
		if (arguments[0] == "msg_revoke")
			CmdHandler.S_revoke(arguments[1], arguments[2], arguments[3])

		if (arguments[0] == "couple_apply_reply" || arguments[0] == "couple_divorce_reply")
			CmdHandler.couple_reply(arguments[0], arguments[1], arguments[2], arguments[3])

		// if (arguments[0] == "enter_group") {

		// }//进群
	},

	//判断数组中是否有某个元素
	in_array: function (item, itemArray) {
		for (var i = 0;i < itemArray.length;i++) {
			if (item == itemArray[i]) {
				return true;
			}
		}
		return false;
	},

	//通知消息较多，单独拿出来
	cmd_receiver: function (message) {
		if (message.content.name == "msg_revoke")//消息撤回通知
			CmdHandler.R_revoke(message)
		else if (message.content.name == "couple_apply" || message.content.name == "couple_divorce")
			CmdHandler.R_couple(message)
		else if (this.in_array(message.content.name, vm.$store.state.messages.group_cmds)) {
			CmdHandler.R_group(message)
		}//判断是否属于群组通知

		
		// if (message.content.name == "group_join" || message.content.name == "group_invite" ||
		//  message.content.name == "group_kick" || message.content.name == "admin_cancel" || 
		//  message.content.name == "admin_setting" || message.content.name == "group_transfer")//群通知
		// 	CmdHandler.R_group(message)

		





		//		"group_join"
		//		"group_kick"
		//		"group_quit"
		//		"group_invite"
		//		"admin_setting" 
		//		"admin_cancel"
		//		"group_transfer"
		//		"friend_apply"
		//		"friend_delete"
		//		"couple_apply"
		//		"couple_divorce"
		//		"group_silenced" //
		//		"group_title"
		//		"group_admin_changed"
		//		"msg_transmit"
	},
	//需要接口
	get_gift: function () {
		var gift = {
			count: 1,
			gid: "583ceb995b5eac57aa0846ee",
			name: "棒棒糖",
			senderDeviceID: "58252d066e998f6bfd67f783",
			senderHeadimg: "http://7x2wk4.com2.z0.glb.qiniucdn.com/Fq6Uxh4S3SkNlEcAEsTLPs08QlcW-head",
			senderName: "折原临也",
			senderUserID: "551d812efbe78e6ec27b1049",
			senderUserNo: 230,
			type: 0,
			url: "http://7x2wk4.com1.z0.glb.clouddn.com/gift/002.png",
		}
		return gift;
	},
	//需要动态更改
	get_magicimg: function (type) {
		if (!type) {
			//点数
			var random_dice = Math.ceil(Math.random() * 6),
				dice = {
					animatedPicLocalUri: "asset:///magic_pic/dice/dice_anim_" + random_dice + ".webp",
					animatedPicUrl: "http://7x2wk4.com2.z0.glb.qiniucdn.com/magic_pic/dice/dice_anim_" + random_dice + ".webp",
					magicPicDesc: "[骰子]",
					magicPicType: "DICE",
					staticPicLocalUri: "asset:///magic_pic/dice/dice_" + random_dice + ".webp",
					staticPicUrl: "http://7x2wk4.com2.z0.glb.qiniucdn.com/magic_pic/dice/dice_" + random_dice + ".webp",
				}
			return dice;
		} else {
			//1石头2剪刀3布
			var random_roshambo = Math.ceil(Math.random() * 3),
				roshambo = {
					nimatedPicLocalUri: "asset:///magic_pic/roshambo/roshambo_anim_" + random_roshambo + ".webp",
					animatedPicUrl: "http://7x2wk4.com2.z0.glb.qiniucdn.com/magic_pic/roshambo/roshambo_anim_" + random_roshambo + ".webp",
					magicPicDesc: "[猜拳]",
					magicPicType: "ROSHAMBO",
					staticPicLocalUri: "asset:///magic_pic/roshambo/roshambo_" + random_roshambo + ".webp",
					staticPicUrl: "http://7x2wk4.com2.z0.glb.qiniucdn.com/magic_pic/roshambo/roshambo_" + random_roshambo + ".webp",
				}
			return roshambo;
		}
	},
}
export default chat;