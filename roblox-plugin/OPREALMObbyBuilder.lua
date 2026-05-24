-- OPREALM Obby Builder v1
-- Install by copying this file to:
-- %LOCALAPPDATA%\Roblox\Plugins\OPREALMObbyBuilder.lua

local HttpService = game:GetService("HttpService")
local Workspace = game:GetService("Workspace")

local toolbar = plugin:CreateToolbar("OPREALM")
local button = toolbar:CreateButton("Obby Builder", "Open OPREALM Obby Builder", "")

local widgetInfo = DockWidgetPluginGuiInfo.new(
	Enum.InitialDockState.Right,
	true,
	false,
	440,
	560,
	340,
	440
)

local widget = plugin:CreateDockWidgetPluginGui("OPREALMObbyBuilder", widgetInfo)
widget.Title = "OPREALM Obby Builder"

local root = Instance.new("Frame")
root.Size = UDim2.fromScale(1, 1)
root.BackgroundColor3 = Color3.fromRGB(8, 18, 47)
root.BorderSizePixel = 0
root.Parent = widget

local padding = Instance.new("UIPadding")
padding.PaddingTop = UDim.new(0, 12)
padding.PaddingRight = UDim.new(0, 12)
padding.PaddingBottom = UDim.new(0, 12)
padding.PaddingLeft = UDim.new(0, 12)
padding.Parent = root

local title = Instance.new("TextLabel")
title.Size = UDim2.new(1, 0, 0, 38)
title.BackgroundTransparency = 1
title.Text = "OPREALM Obby Builder"
title.TextColor3 = Color3.fromRGB(255, 255, 255)
title.Font = Enum.Font.GothamBold
title.TextSize = 22
title.TextXAlignment = Enum.TextXAlignment.Left
title.Parent = root

local box = Instance.new("TextBox")
box.Size = UDim2.new(1, 0, 0, 270)
box.Position = UDim2.fromOffset(0, 54)
box.BackgroundColor3 = Color3.fromRGB(28, 42, 82)
box.BorderColor3 = Color3.fromRGB(83, 112, 170)
box.TextColor3 = Color3.fromRGB(255, 255, 255)
box.PlaceholderColor3 = Color3.fromRGB(170, 190, 230)
box.PlaceholderText = "Paste OPREALM Plugin JSON here..."
box.Text = ""
box.ClearTextOnFocus = false
box.MultiLine = true
box.TextWrapped = false
box.TextXAlignment = Enum.TextXAlignment.Left
box.TextYAlignment = Enum.TextYAlignment.Top
box.Font = Enum.Font.Code
box.TextSize = 13
box.Parent = root

local buildButton = Instance.new("TextButton")
buildButton.Size = UDim2.new(1, 0, 0, 48)
buildButton.Position = UDim2.fromOffset(0, 340)
buildButton.BackgroundColor3 = Color3.fromRGB(24, 217, 255)
buildButton.TextColor3 = Color3.fromRGB(7, 16, 58)
buildButton.Text = "Build Obby"
buildButton.Font = Enum.Font.GothamBold
buildButton.TextSize = 18
buildButton.Parent = root

local clearButton = Instance.new("TextButton")
clearButton.Size = UDim2.new(1, 0, 0, 42)
clearButton.Position = UDim2.fromOffset(0, 398)
clearButton.BackgroundColor3 = Color3.fromRGB(55, 70, 112)
clearButton.TextColor3 = Color3.fromRGB(255, 255, 255)
clearButton.Text = "Clear Previous OPREALM Obby"
clearButton.Font = Enum.Font.GothamBold
clearButton.TextSize = 15
clearButton.Parent = root

local status = Instance.new("TextLabel")
status.Size = UDim2.new(1, 0, 0, 82)
status.Position = UDim2.fromOffset(0, 456)
status.BackgroundTransparency = 1
status.Text = "Paste Plugin JSON from OPREALM, then click Build Obby."
status.TextColor3 = Color3.fromRGB(170, 190, 230)
status.Font = Enum.Font.Gotham
status.TextSize = 14
status.TextWrapped = true
status.TextXAlignment = Enum.TextXAlignment.Left
status.TextYAlignment = Enum.TextYAlignment.Top
status.Parent = root

local THEME_COLORS = {
	Volcano = {
		base = Color3.fromRGB(52, 44, 50),
		platform = Color3.fromRGB(70, 70, 82),
		hazard = Color3.fromRGB(255, 78, 26),
		accent = Color3.fromRGB(255, 178, 44),
	},
	Candy = {
		base = Color3.fromRGB(255, 176, 221),
		platform = Color3.fromRGB(255, 236, 150),
		hazard = Color3.fromRGB(255, 86, 124),
		accent = Color3.fromRGB(103, 221, 255),
	},
	Space = {
		base = Color3.fromRGB(18, 22, 58),
		platform = Color3.fromRGB(80, 101, 190),
		hazard = Color3.fromRGB(77, 230, 255),
		accent = Color3.fromRGB(170, 101, 255),
	},
	Cyber = {
		base = Color3.fromRGB(10, 18, 34),
		platform = Color3.fromRGB(33, 64, 96),
		hazard = Color3.fromRGB(24, 217, 255),
		accent = Color3.fromRGB(204, 64, 255),
	},
	Jungle = {
		base = Color3.fromRGB(32, 74, 44),
		platform = Color3.fromRGB(82, 112, 54),
		hazard = Color3.fromRGB(220, 76, 36),
		accent = Color3.fromRGB(76, 205, 112),
	},
}

local function setStatus(message)
	status.Text = message
	print("[OPREALM]", message)
end

local function getOrCreateFolder()
	local existing = Workspace:FindFirstChild("OPREALM_Generated_Obby")
	if existing then
		existing:Destroy()
	end

	local folder = Instance.new("Folder")
	folder.Name = "OPREALM_Generated_Obby"
	folder.Parent = Workspace
	return folder
end

local function createPart(parent, name, size, position, color, material, anchored)
	local part = Instance.new("Part")
	part.Name = name
	part.Size = size
	part.Position = position
	part.Color = color
	part.Material = material or Enum.Material.SmoothPlastic
	part.Anchored = anchored ~= false
	part.TopSurface = Enum.SurfaceType.Smooth
	part.BottomSurface = Enum.SurfaceType.Smooth
	part.Parent = parent
	return part
end

local function addRuntimeScript(parent)
	local runtime = Instance.new("Script")
	runtime.Name = "OPREALM_Runtime"
	runtime.Source = [[
local TweenService = game:GetService("TweenService")

local folder = script.Parent
local checkpoints = {}

local function humanoidFromHit(hit)
	local character = hit and hit.Parent
	if not character then return nil end
	return character:FindFirstChildWhichIsA("Humanoid")
end

local function rootFromHumanoid(humanoid)
	return humanoid and humanoid.Parent and humanoid.Parent:FindFirstChild("HumanoidRootPart")
end

local function killPlayer(hit)
	local humanoid = humanoidFromHit(hit)
	if humanoid then
		humanoid.Health = 0
	end
end

for _, item in ipairs(folder:GetDescendants()) do
	if item:IsA("BasePart") and item:GetAttribute("OPREALM_Kill") then
		item.Touched:Connect(killPlayer)
	end

	if item:IsA("BasePart") and item:GetAttribute("OPREALM_Checkpoint") then
		item.Touched:Connect(function(hit)
			local humanoid = humanoidFromHit(hit)
			local root = rootFromHumanoid(humanoid)
			if humanoid and root then
				checkpoints[humanoid.Parent] = item.CFrame + Vector3.new(0, 5, 0)
			end
		end)
	end

	if item:IsA("BasePart") and item:GetAttribute("OPREALM_SpeedBoost") then
		item.Touched:Connect(function(hit)
			local humanoid = humanoidFromHit(hit)
			if humanoid then
				humanoid.WalkSpeed = 34
				task.delay(3, function()
					if humanoid then humanoid.WalkSpeed = 16 end
				end)
			end
		end)
	end

	if item:IsA("BasePart") and item:GetAttribute("OPREALM_Disappearing") then
		task.spawn(function()
			while item.Parent do
				item.Transparency = 0
				item.CanCollide = true
				task.wait(1.4)
				item.Transparency = 0.75
				item.CanCollide = false
				task.wait(1.0)
			end
		end)
	end

	if item:IsA("BasePart") and item:GetAttribute("OPREALM_Moving") then
		task.spawn(function()
			local start = item.CFrame
			local distance = item:GetAttribute("OPREALM_MoveDistance") or 18
			local goal = start * CFrame.new(0, 0, distance)
			local info = TweenInfo.new(2.2, Enum.EasingStyle.Sine, Enum.EasingDirection.InOut, -1, true)
			TweenService:Create(item, info, { CFrame = goal }):Play()
		end)
	end

	if item:IsA("BasePart") and item:GetAttribute("OPREALM_Spinning") then
		task.spawn(function()
			while item.Parent do
				item.CFrame = item.CFrame * CFrame.Angles(0, math.rad(5), 0)
				task.wait()
			end
		end)
	end

	if item:IsA("BasePart") and item:GetAttribute("OPREALM_Conveyor") then
		item.Touched:Connect(function(hit)
			local root = rootFromHumanoid(humanoidFromHit(hit))
			if root then
				root.AssemblyLinearVelocity = Vector3.new(34, root.AssemblyLinearVelocity.Y, 0)
			end
		end)
	end
end

game.Players.PlayerAdded:Connect(function(player)
	player.CharacterAdded:Connect(function(character)
		local humanoid = character:WaitForChild("Humanoid", 8)
		if not humanoid then return end
		humanoid.Died:Connect(function()
			task.wait(0.2)
			local checkpoint = checkpoints[character]
			if checkpoint and player.Character then
				local root = player.Character:FindFirstChild("HumanoidRootPart")
				if root then root.CFrame = checkpoint end
			end
		end)
	end)
end)
]]
	runtime.Parent = parent
	return runtime
end

local function makeKillZone(part)
	part:SetAttribute("OPREALM_Kill", true)
	part.CanCollide = false
	return part
end

local function createLabel(parent, text, position)
	local sign = createPart(parent, "Label_" .. text, Vector3.new(12, 5, 1), position, Color3.fromRGB(8, 18, 47), Enum.Material.SmoothPlastic)
	local gui = Instance.new("SurfaceGui")
	gui.Face = Enum.NormalId.Front
	gui.Parent = sign

	local label = Instance.new("TextLabel")
	label.Size = UDim2.fromScale(1, 1)
	label.BackgroundTransparency = 1
	label.Text = text
	label.TextColor3 = Color3.fromRGB(255, 255, 255)
	label.Font = Enum.Font.GothamBold
	label.TextScaled = true
	label.Parent = gui
	return sign
end

local function createCheckpoint(parent, index, position)
	local pad = createPart(parent, "Checkpoint_" .. index, Vector3.new(10, 1, 10), position, Color3.fromRGB(49, 214, 139), Enum.Material.Neon)
	pad:SetAttribute("OPREALM_Checkpoint", index)
	createLabel(parent, "Checkpoint " .. index, position + Vector3.new(0, 6, -6))
	return pad
end

local function createHazard(parent, obstacle, position, theme)
	local colors = THEME_COLORS[theme] or THEME_COLORS.Volcano
	if obstacle == "Spinning hammers" then
		local arm = createPart(parent, "SpinningHammerArm", Vector3.new(26, 1.2, 1.2), position + Vector3.new(0, 5, 0), colors.hazard, Enum.Material.Neon)
		arm:SetAttribute("OPREALM_Spinning", true)
		arm:SetAttribute("OPREALM_Kill", true)
		createPart(parent, "SpinningHammerPivot", Vector3.new(2, 6, 2), position + Vector3.new(0, 3, 0), colors.accent, Enum.Material.Neon)
		return arm
	end

	if obstacle == "Speed boosts" then
		local boost = createPart(parent, "SpeedBoost", Vector3.new(12, 0.6, 8), position + Vector3.new(0, 0.8, 0), colors.accent, Enum.Material.Neon)
		boost:SetAttribute("OPREALM_SpeedBoost", true)
		return boost
	end

	if obstacle == "Conveyor belts" then
		local belt = createPart(parent, "ConveyorBelt", Vector3.new(18, 1, 10), position, Color3.fromRGB(35, 38, 50), Enum.Material.Metal)
		belt:SetAttribute("OPREALM_Conveyor", true)
		createPart(parent, "ConveyorArrow", Vector3.new(6, 0.4, 2), position + Vector3.new(0, 1, -1), colors.accent, Enum.Material.Neon)
		return belt
	end

	if obstacle == "Disappearing platforms" then
		local ghost = createPart(parent, "DisappearingPlatform", Vector3.new(14, 1, 10), position, colors.platform, Enum.Material.Glass)
		ghost.Transparency = 0.24
		ghost:SetAttribute("OPREALM_Disappearing", true)
		return ghost
	end

	return makeKillZone(createPart(parent, "LavaJumpKillZone_" .. obstacle, Vector3.new(24, 0.8, 16), position + Vector3.new(0, -1.4, 0), colors.hazard, Enum.Material.Neon))
end

local function addThemeDecor(parent, theme, position, index)
	local colors = THEME_COLORS[theme] or THEME_COLORS.Volcano
	if theme == "Candy" then
		createPart(parent, "LollipopStick_" .. index, Vector3.new(1, 16, 1), position + Vector3.new(-12, 8, -8), Color3.fromRGB(255, 255, 255), Enum.Material.SmoothPlastic)
		local ball = createPart(parent, "LollipopTop_" .. index, Vector3.new(8, 8, 2), position + Vector3.new(-12, 18, -8), colors.hazard, Enum.Material.Neon)
		ball.Shape = Enum.PartType.Ball
	elseif theme == "Space" then
		local asteroid = createPart(parent, "Asteroid_" .. index, Vector3.new(6, 6, 6), position + Vector3.new(-12, 10, -8), Color3.fromRGB(90, 92, 108), Enum.Material.Slate)
		asteroid.Shape = Enum.PartType.Ball
	elseif theme == "Jungle" then
		createPart(parent, "Vine_" .. index, Vector3.new(1, 18, 1), position + Vector3.new(-12, 9, -8), colors.accent, Enum.Material.Grass)
	elseif theme == "Cyber" then
		createPart(parent, "NeonPillar_" .. index, Vector3.new(2, 18, 2), position + Vector3.new(-12, 9, -8), colors.hazard, Enum.Material.Neon)
	else
		createPart(parent, "VolcanoRock_" .. index, Vector3.new(7, 7, 7), position + Vector3.new(-12, 3.5, -8), colors.base, Enum.Material.Slate)
	end
end

local function decodePayload()
	local text = box.Text
	if text == nil or text:gsub("%s+", "") == "" then
		error("Paste OPREALM Plugin JSON first.")
	end

	local ok, payload = pcall(function()
		return HttpService:JSONDecode(text)
	end)

	if not ok or typeof(payload) ~= "table" then
		error("That is not valid JSON. Copy the Plugin JSON box from OPREALM again.")
	end

	if payload.command ~= "BuildObbyFromSpec" then
		error("This JSON is not an OPREALM obby build payload.")
	end

	return payload
end

local function buildObby(payload)
	local plan = payload.plan or {}
	local theme = plan.theme or "Volcano"
	local difficulty = plan.difficulty or "Easy"
	local colors = THEME_COLORS[theme] or THEME_COLORS.Volcano
	local sectionCount = tonumber(plan.sectionCount) or 4
	local obstacles = plan.obstacles or { "Moving platforms", "Lava jumps", "Disappearing platforms" }

	local folder = getOrCreateFolder()

	addRuntimeScript(folder)
	createPart(folder, "ObsidianUnderplate", Vector3.new(sectionCount * 72 + 90, 2, 70), Vector3.new(sectionCount * 36, -5, 0), colors.base, Enum.Material.Slate)
	local lava = makeKillZone(createPart(folder, "FloorIsLava_KillZone", Vector3.new(sectionCount * 72 + 120, 1, 78), Vector3.new(sectionCount * 36, 0.5, 0), colors.hazard, Enum.Material.Neon))
	lava.Transparency = 0.08
	createPart(folder, "SpawnPad", Vector3.new(18, 1.5, 18), Vector3.new(0, 4, 0), Color3.fromRGB(24, 217, 255), Enum.Material.Neon)
	createLabel(folder, "OPREALM " .. theme .. " Obby", Vector3.new(0, 14, -12))

	local spawn = Instance.new("SpawnLocation")
	spawn.Name = "OPREALM_Spawn"
	spawn.Size = Vector3.new(10, 1, 10)
	spawn.Position = Vector3.new(0, 5, 0)
	spawn.Anchored = true
	spawn.Color = Color3.fromRGB(24, 217, 255)
	spawn.Material = Enum.Material.Neon
	spawn.Parent = folder

	local gap = difficulty == "Hard" and 15 or difficulty == "Medium" and 13 or 11
	local platformSize = difficulty == "Hard" and Vector3.new(11, 1.5, 10) or Vector3.new(14, 1.5, 12)

	for sectionIndex = 1, sectionCount do
		local obstacle = obstacles[((sectionIndex - 1) % #obstacles) + 1]
		local baseX = sectionIndex * 58
		local platformCount = difficulty == "Hard" and 5 or difficulty == "Medium" and 4 or 3

		for platformIndex = 1, platformCount do
			local x = baseX + platformIndex * gap
			local z = ((platformIndex % 2 == 0) and 8 or -8)
			local y = 5 + math.min(sectionIndex, 5) * 0.25
			local platform = createPart(folder, "Section_" .. sectionIndex .. "_Platform_" .. platformIndex, platformSize, Vector3.new(x, y, z), colors.platform, Enum.Material.SmoothPlastic)

			if obstacle == "Moving platforms" and platformIndex % 2 == 0 then
				platform.Name = platform.Name .. "_Moving"
				platform.Color = colors.accent
				platform:SetAttribute("OPREALM_Moving", true)
				platform:SetAttribute("OPREALM_MoveDistance", 18)
			end
		end

		createHazard(folder, obstacle, Vector3.new(baseX + gap * 2.5, 4, 0), theme)
		addThemeDecor(folder, theme, Vector3.new(baseX + gap * 2.5, 4, 0), sectionIndex)
		createCheckpoint(folder, sectionIndex, Vector3.new(baseX + gap * (platformCount + 1), 5, 0))
	end

	local finishX = (sectionCount + 1) * 70
	createPart(folder, "FinishPad", Vector3.new(22, 2, 22), Vector3.new(finishX, 6, 0), Color3.fromRGB(49, 214, 139), Enum.Material.Neon)
	createLabel(folder, "FINISH", Vector3.new(finishX, 16, -12))

	Workspace.CurrentCamera.CFrame = CFrame.new(Vector3.new(sectionCount * 38, 95, 120), Vector3.new(sectionCount * 38, 4, 0))
	setStatus("Built " .. theme .. " " .. difficulty .. " obby with " .. sectionCount .. " sections. Press Play to test it.")
end

button.Click:Connect(function()
	widget.Enabled = not widget.Enabled
end)

buildButton.MouseButton1Click:Connect(function()
	local ok, result = pcall(function()
		local payload = decodePayload()
		buildObby(payload)
	end)

	if not ok then
		setStatus(tostring(result))
	end
end)

clearButton.MouseButton1Click:Connect(function()
	local existing = Workspace:FindFirstChild("OPREALM_Generated_Obby")
	if existing then
		existing:Destroy()
		setStatus("Cleared previous OPREALM obby.")
	else
		setStatus("No OPREALM obby to clear.")
	end
end)
